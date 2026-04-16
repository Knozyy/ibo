import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.categories import CategoryRepository
from app.schemas.categories import CategoryCreate, CategoryOut


async def list_categories(db: AsyncSession) -> list[CategoryOut]:
    repo = CategoryRepository(db)
    categories = await repo.get_all()
    return [CategoryOut.model_validate(c) for c in categories]


async def create_category(body: CategoryCreate, db: AsyncSession) -> CategoryOut:
    repo = CategoryRepository(db)
    category = await repo.create(name=body.name, slug=body.slug)
    return CategoryOut.model_validate(category)


async def delete_category(category_id: uuid.UUID, db: AsyncSession) -> None:
    repo = CategoryRepository(db)
    category = await repo.get_by_id(category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    await repo.delete(category)
