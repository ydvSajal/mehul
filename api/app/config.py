from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql://groundup:groundup@localhost:5432/groundup"
    jwt_secret: str = "dev-only-change-me"
    jwt_ttl_days: int = 7
    google_client_id: str = ""
    cors_origins: str = "http://localhost:3000"

    @property
    def sqlalchemy_url(self) -> str:
        # Neon/Render hand out postgres:// or postgresql:// URLs; SQLAlchemy needs the driver named.
        url = self.database_url.replace("postgres://", "postgresql://", 1)
        return url.replace("postgresql://", "postgresql+psycopg://", 1)


settings = Settings()

if settings.env == "production" and settings.jwt_secret == "dev-only-change-me":
    raise RuntimeError("JWT_SECRET must be set in production")
