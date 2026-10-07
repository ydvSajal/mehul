from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ARRAY, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

# UUID keys: safe to generate anywhere, no hot sequence, shard/merge friendly for Stage 2.


class User(Base):
    __tablename__ = "users"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True)
    name: Mapped[str | None] = mapped_column(String(120))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    role: Mapped[str] = mapped_column(String(20), default="athlete")  # athlete | coach | scout | team
    mode: Mapped[str] = mapped_column(String(20), default="casual")  # professional | casual
    # Only the document type and status are kept. Never store ID numbers (Aadhaar Act s.29).
    verification_doc: Mapped[str | None] = mapped_column(String(30))
    verification_status: Mapped[str] = mapped_column(String(20), default="unverified")  # unverified|pending|verified|rejected
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    profile: Mapped["Profile | None"] = relationship(back_populates="user", uselist=False, lazy="joined")


class Profile(Base):
    """Athlete features for the recommender. Field names match app.matching."""
    __tablename__ = "profiles"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    sport: Mapped[str | None] = mapped_column(String(40), index=True)
    position: Mapped[str | None] = mapped_column(String(60))
    age: Mapped[int | None]
    city: Mapped[str | None] = mapped_column(String(80))
    region: Mapped[str | None] = mapped_column(String(40))
    level: Mapped[str | None] = mapped_column(String(20))
    skills: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list)
    goals: Mapped[str | None] = mapped_column(Text)
    bio: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    user: Mapped[User] = relationship(back_populates="profile")


class Opportunity(Base):
    __tablename__ = "opportunities"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    posted_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(160))
    org: Mapped[str] = mapped_column(String(120))
    type: Mapped[str] = mapped_column(String(20))  # trial | scholarship | tournament | camp
    sport: Mapped[str] = mapped_column(String(40))
    positions: Mapped[list[str]] = mapped_column(ARRAY(String(60)), default=list)
    age_min: Mapped[int | None]
    age_max: Mapped[int | None]
    city: Mapped[str | None] = mapped_column(String(80))
    region: Mapped[str | None] = mapped_column(String(40))
    level: Mapped[str | None] = mapped_column(String(20))
    skills: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list)
    description: Mapped[str | None] = mapped_column(Text)
    deadline: Mapped[datetime | None]
    synthetic: Mapped[bool] = mapped_column(default=False)  # report: real and synthetic data kept labelled
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("ix_opp_sport_created", "sport", "created_at"),)


class Post(Base):
    __tablename__ = "posts"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    author_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)
    author: Mapped[User] = relationship(lazy="joined")
