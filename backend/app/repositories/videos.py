import uuid
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.video import Video, VideoStatus


class VideoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, video_id: uuid.UUID) -> Optional[Video]:
        result = await self.db.execute(
            select(Video).where(Video.id == video_id)
        )
        return result.scalars().first()

    async def get_paginated(
        self,
        page: int,
        limit: int,
        category_id: Optional[uuid.UUID] = None,
    ) -> tuple[list[Video], int]:
        query = select(Video)
        count_query = select(func.count()).select_from(Video)
        if category_id:
            query = query.where(Video.category_id == category_id)
            count_query = count_query.where(Video.category_id == category_id)
        query = query.order_by(Video.created_at.desc()).offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        count_result = await self.db.execute(count_query)
        return list(result.scalars().all()), count_result.scalar_one()

    async def create(
        self,
        title: str,
        original_url: str,
        category_id: Optional[uuid.UUID],
    ) -> Video:
        video = Video(
            id=uuid.uuid4(),
            title=title,
            original_url=original_url,
            category_id=category_id,
            status=VideoStatus.PENDING,
        )
        self.db.add(video)
        await self.db.commit()
        await self.db.refresh(video)
        return video

    async def delete(self, video: Video) -> None:
        await self.db.delete(video)
        await self.db.commit()

    async def update_status(self, video_id: uuid.UUID, status: VideoStatus) -> None:
        video = await self.get_by_id(video_id)
        if video:
            video.status = status
            await self.db.commit()

    async def update_completed(
        self,
        video_id: uuid.UUID,
        file_path: str,
        thumbnail_path: Optional[str],
    ) -> None:
        video = await self.get_by_id(video_id)
        if video:
            video.status = VideoStatus.COMPLETED
            video.file_path = file_path
            video.thumbnail_path = thumbnail_path
            await self.db.commit()

    async def update_failed(self, video_id: uuid.UUID, error_message: str) -> None:
        video = await self.get_by_id(video_id)
        if video:
            video.status = VideoStatus.FAILED
            video.error_message = error_message
            await self.db.commit()
