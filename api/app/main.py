from datetime import datetime
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app import matching
from app.auth import current_user, issue_token, verify_google
from app.config import settings
from app.db import get_db
from app.models import Opportunity, Post, Profile, User

app = FastAPI(title="Ground Up API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- schemas ----------
class GoogleIn(BaseModel):
    credential: str


class DevLoginIn(BaseModel):
    email: EmailStr
    name: str = "Dev Athlete"


class ProfileIn(BaseModel):
    name: str | None = Field(None, max_length=120)
    role: Literal["athlete", "coach", "scout", "team"] | None = None
    mode: Literal["professional", "casual"] | None = None
    sport: str | None = Field(None, max_length=40)
    position: str | None = Field(None, max_length=60)
    age: int | None = Field(None, ge=8, le=60)
    city: str | None = Field(None, max_length=80)
    region: str | None = Field(None, max_length=40)
    level: Literal["beginner", "district", "state", "national", "professional"] | None = None
    skills: list[str] | None = Field(None, max_length=20)
    goals: str | None = Field(None, max_length=1000)
    bio: str | None = Field(None, max_length=1000)


class VerificationIn(BaseModel):
    doc_type: Literal["aadhaar", "passport", "driving_licence", "other"]


class PostIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


PROFILE_FIELDS = ["sport", "position", "age", "city", "region", "level", "skills", "goals", "bio"]


def user_out(u: User) -> dict:
    p = u.profile
    return {
        "id": str(u.id), "email": u.email, "name": u.name, "avatar_url": u.avatar_url, "role": u.role,
        "mode": u.mode, "verification_status": u.verification_status,
        "profile": {f: getattr(p, f) for f in PROFILE_FIELDS} if p else None,
    }


def opp_out(o: Opportunity) -> dict:
    return {c: getattr(o, c) for c in ["title", "org", "type", "sport", "positions", "age_min", "age_max",
                                         "city", "region", "level", "skills", "description", "deadline", "synthetic"]} | {"id": str(o.id)}


def login(db: Session, email: str, name: str | None, avatar: str | None = None) -> dict:
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, name=name, avatar_url=avatar)
        db.add(user)
        db.commit()
    return {"token": issue_token(user), "user": user_out(user)}


# ---------- routes ----------
@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/google")
def auth_google(body: GoogleIn, db: Session = Depends(get_db)):
    info = verify_google(body.credential)
    if not info.get("email_verified"):
        raise HTTPException(401, "Google email not verified")
    return login(db, info["email"], info.get("name"), info.get("picture"))


@app.post("/auth/dev")
def auth_dev(body: DevLoginIn, db: Session = Depends(get_db)):
    """Local-only shortcut so the app is usable before Google OAuth is configured."""
    if settings.env == "production":
        raise HTTPException(404)
    return login(db, body.email, body.name)


@app.get("/me")
def me(user: User = Depends(current_user)):
    return user_out(user)


@app.put("/me/profile")
def update_profile(body: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    for f in ("name", "role", "mode"):
        if f in data:
            setattr(user, f, data.pop(f))
    if user.profile is None:
        user.profile = Profile(user_id=user.id)
    if "skills" in data:
        data["skills"] = [s.strip().lower() for s in data["skills"] if s.strip()]
    for f, v in data.items():
        setattr(user.profile, f, v)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_out(user)


@app.post("/me/verification")
def submit_verification(body: VerificationIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # ponytail: records intent only. Real check goes through a licensed KYC provider (e.g. DigiLocker) later.
    user.verification_doc = body.doc_type
    user.verification_status = "pending"
    db.add(user)
    db.commit()
    return user_out(user)


@app.get("/opportunities")
def list_opportunities(sport: str | None = None, limit: int = 20, db: Session = Depends(get_db)):
    q = select(Opportunity).order_by(Opportunity.created_at.desc()).limit(min(limit, 100))
    if sport:
        q = q.where(Opportunity.sport == sport.lower())
    return [opp_out(o) for o in db.scalars(q)]


@app.get("/opportunities/recommended")
def recommended(k: int = 10, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = user.profile
    if not p or not p.sport:
        return []
    # Candidate retrieval in SQL (sport + age window), scoring in Python.
    # ponytail: 500 newest candidates scored per request. Stage 2: precompute per athlete in a worker, cache in Redis.
    tol = matching.AGE_TOLERANCE
    q = select(Opportunity).where(Opportunity.sport == p.sport).order_by(Opportunity.created_at.desc()).limit(500)
    if p.age is not None:
        q = q.where(or_(Opportunity.age_min.is_(None), Opportunity.age_min - tol <= p.age),
                    or_(Opportunity.age_max.is_(None), Opportunity.age_max + tol >= p.age))
    ranked = matching.rank(p, list(db.scalars(q)), k=min(k, 50))
    return [{"opportunity": opp_out(r["opportunity"]), "score": r["score"], "components": r["components"],
             "reasons": r["reasons"]} for r in ranked]


@app.get("/posts")
def list_posts(before: datetime | None = None, limit: int = 20, db: Session = Depends(get_db)):
    # Keyset pagination: stays fast at millions of rows, unlike OFFSET.
    q = select(Post).order_by(Post.created_at.desc()).limit(min(limit, 50))
    if before:
        q = q.where(Post.created_at < before)
    return [{"id": str(p.id), "body": p.body, "created_at": p.created_at,
             "author": {"id": str(p.author.id), "name": p.author.name, "avatar_url": p.author.avatar_url,
                        "role": p.author.role}} for p in db.scalars(q).unique()]


@app.post("/posts", status_code=201)
def create_post(body: PostIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    post = Post(author_id=user.id, body=body.body.strip())
    db.add(post)
    db.commit()
    return {"id": str(post.id)}


@app.get("/people/suggested")
def suggested_people(user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = user.profile
    if not p or not p.sport:
        return []
    rows = db.scalars(select(Profile).options(joinedload(Profile.user))
                      .where(Profile.sport == p.sport, Profile.user_id != user.id).limit(200)).unique().all()
    # Content-based similarity on profiles: reuse the matcher's skill cosine + location.
    scored = sorted(rows, key=lambda o: matching.skills_score(p.skills, o.skills) + (o.city == p.city) * 0.5, reverse=True)
    return [{"id": str(o.user_id), "name": o.user.name, "avatar_url": o.user.avatar_url, "position": o.position,
             "city": o.city, "role": o.user.role} for o in scored[:5]]
