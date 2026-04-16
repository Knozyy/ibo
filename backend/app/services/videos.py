import uuid
import os
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.videos import VideoRepository
from app.schemas.videos import VideoOut, VideoPage, VideoStatusOut
from app.config import settings


async def list_videos(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    category_id: Optional[uuid.UUID] = None,
) -> VideoPage:
    repo = VideoRepository(db)
    videos, total = await repo.get_paginated(page=page, limit=limit, category_id=category_id)
    pages = (total + limit - 1) // limit if total > 0 else 0
    return VideoPage(
        items=[VideoOut.model_validate(v) for v in videos],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


async def get_video(video_id: uuid.UUID, db: AsyncSession) -> VideoOut:
    repo = VideoRepository(db)
    video = await repo.get_by_id(video_id)
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return VideoOut.model_validate(video)


async def get_video_status(video_id: uuid.UUID, db: AsyncSession) -> VideoStatusOut:
    repo = VideoRepository(db)
    video = await repo.get_by_id(video_id)
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return VideoStatusOut.model_validate(video)


async def delete_video(video_id: uuid.UUID, db: AsyncSession) -> None:
    repo = VideoRepository(db)
    video = await repo.get_by_id(video_id)
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    for path_attr in [video.file_path, video.thumbnail_path]:
        if path_attr:
            full_path = path_attr.replace("/media", settings.media_root, 1)
            if os.path.exists(full_path):
                os.remove(full_path)
    await repo.delete(video)
