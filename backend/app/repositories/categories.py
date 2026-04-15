import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.category import Category


class CategoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Category]:
        result = await self.db.execute(select(Category).order_by(Category.name))
        return list(result.scalars().all())

    async def get_by_id(self, category_id: uuid.UUID) -> Optional[Category]:
        result = await self.db.execute(
            select(Category).where(Category.id == category_id)
        )
        return result.scalars().first()

    async def create(self, name: str, slug: str) -> Category:
        category = Category(id=uuid.uuid4(), name=name, slug=slug)
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete(self, category: Category) -> None:
        self.db.delete(category)
        await self.db.commit()
