import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VideoStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    original_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[VideoStatus] = mapped_column(
        String(32), default=VideoStatus.PENDING, nullable=False
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    category: Mapped[Optional["Category"]] = relationship(
        "Category", back_populates="videos"
    )
