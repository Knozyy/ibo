import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.repositories.videos import VideoRepository
from app.schemas.videos import VideoCreate, VideoOut, VideoPage, VideoStatusOut
from app.services.auth import get_current_admin
from app.services.videos import delete_video, get_video_status
from app.tasks.download import download_video

router = APIRouter(tags=["videos"])


@router.get("/videos", response_model=VideoPage)
async def list_videos_endpoint(
    page: int = 1,
    limit: int = 20,
    category_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    repo = VideoRepository(db)
    videos, total = await repo.get_paginated(page=page, limit=limit, category_id=category_id)
    pages = (total + limit - 1) // limit if total > 0 else 0
    return VideoPage(items=videos, total=total, page=page, limit=limit, pages=pages)


@router.get("/videos/{video_id}/status", response_model=VideoStatusOut)
async def get_status(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    return await get_video_status(video_id, db)


@router.get("/videos/{video_id}", response_model=VideoOut)
async def get_video(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    repo = VideoRepository(db)
    video = await repo.get_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.post("/videos", response_model=VideoOut, status_code=status.HTTP_201_CREATED)
async def create_video(
    body: VideoCreate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    repo = VideoRepository(db)
    video = await repo.create(
        title=body.title,
        original_url=body.original_url,
        category_id=body.category_id,
    )
    download_video.delay(str(video.id))
    return video


@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video_endpoint(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    await delete_video(video_id, db)
