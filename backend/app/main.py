from contextlib import asynccontextmanager

from fastapi import FastAPI
from passlib.context import CryptContext
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
from app.config import settings
import app.models  # noqa: F401 — tüm modelleri Base.metadata'ya kaydet

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tabloları oluştur (development için; production'da Alembic kullan)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Admin seed
    await _seed_admin()

    yield


async def _seed_admin():
    from app.models.admin import Admin
    from uuid import uuid4

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Admin))
        existing = result.scalars().first()
        if not existing:
            admin = Admin(
                id=uuid4(),
                username=settings.admin_username,
                hashed_password=pwd_context.hash(settings.admin_password),
            )
            session.add(admin)
            await session.commit()


app = FastAPI(title="VideoPortal API", lifespan=lifespan)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
