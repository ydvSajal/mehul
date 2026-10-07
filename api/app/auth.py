from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

bearer = HTTPBearer(auto_error=False)


def issue_token(user: User) -> str:
    exp = datetime.now(UTC) + timedelta(days=settings.jwt_ttl_days)
    return jwt.encode({"sub": str(user.id), "exp": exp}, settings.jwt_secret, algorithm="HS256")


def verify_google(credential: str) -> dict:
    if not settings.google_client_id:
        raise HTTPException(503, "Google sign-in not configured")
    try:
        return id_token.verify_oauth2_token(credential, google_requests.Request(), settings.google_client_id)
    except ValueError:
        raise HTTPException(401, "Invalid Google token")


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not creds:
        raise HTTPException(401, "Not signed in")
    try:
        sub = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])["sub"]
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(User, UUID(sub))
    if not user:
        raise HTTPException(401, "User not found")
    return user
