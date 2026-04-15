import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.video import VideoStatus


class VideoCreate(BaseModel):
    title: str
    original_url: str
    category_id: Optional[uuid.UUID] = None


class VideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    original_url: str
    file_path: Optional[str]
    thumbnail_path: Optional[str]
    status: VideoStatus
    error_message: Optional[str]
    category_id: Optional[uuid.UUID]
    created_at: datetime


class VideoStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: VideoStatus
    error_message: Optional[str]


class VideoPage(BaseModel):
    items: list[VideoOut]
    total: int
    page: int
    limit: int
    pages: int
