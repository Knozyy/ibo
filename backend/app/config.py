from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://videoportal:changeme@db:5432/videoportal_db"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Auth
    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Admin Seed
    admin_username: str = "admin"
    admin_password: str = "changeme"

    # Media
    media_root: str = "/media"


settings = Settings()
