from datetime import datetime

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# Neon: use the *pooled* connection string (-pooler host). pool_pre_ping survives Neon autosuspend.
# ponytail: small pool sized for Render free + Neon free; raise with instance count on AWS (see ARCHITECTURE.md).
engine = create_engine(settings.sqlalchemy_url, pool_size=5, max_overflow=5, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    type_annotation_map = {datetime: DateTime(timezone=True)}


def get_db():
    with SessionLocal() as db:
        yield db
