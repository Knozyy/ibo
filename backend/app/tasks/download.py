import asyncio
import subprocess
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import yt_dlp
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.celery_app import celery_app
from app.config import settings
from app.models.video import VideoStatus
from app.repositories.videos import VideoRepository


class _NoRetryError(Exception):
    """DRM, 404 veya extraction hatası — retry edilmez."""
    pass


@asynccontextmanager
async def _task_db() -> AsyncSession:
    """
    Celery task için fork-safe DB bağlantısı.
    AsyncSessionLocal modül seviyesinde oluşturulur, Celery fork'layınca
    engine'in iç asyncpg bağlantıları eski event loop'a bağlı kalır.
    Her task çağrısında yeni engine açıp kapatarak bunu önlüyoruz.
    """
    engine = create_async_engine(
        settings.database_url,
        pool_size=1,
        max_overflow=0,
        pool_pre_ping=True,
    )
    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            yield session
    finally:
        await engine.dispose()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def download_video(self, video_id: str):
    """Video indir. Network hatasında 3 kez retry, DRM/not-found'da direkt fail."""
    asyncio.run(_run(self, video_id))


async def _run(task, video_id: str) -> None:
    try:
        await _execute_download(video_id)
    except _NoRetryError as e:
        await _mark_failed(video_id, str(e))
    except Exception as exc:
        try:
            raise task.retry(exc=exc)
        except task.MaxRetriesExceededError:
            await _mark_failed(video_id, f"Max retries exceeded: {str(exc)[:400]}")


async def _execute_download(video_id: str) -> None:
    # 1. Video bilgilerini al ve status güncelle
    async with _task_db() as db:
        repo = VideoRepository(db)
        video = await repo.get_by_id(uuid.UUID(video_id))
        if not video:
            return
        original_url = video.original_url
        await repo.update_status(video.id, VideoStatus.PROCESSING)

    # 2. Dosya yollarını hazırla
    media_root = Path(settings.media_root)
    videos_dir = media_root / "videos"
    thumbnails_dir = media_root / "thumbnails"
    videos_dir.mkdir(parents=True, exist_ok=True)
    thumbnails_dir.mkdir(parents=True, exist_ok=True)

    outtmpl = str(videos_dir / f"{video_id}.%(ext)s")

    ydl_opts = {
        "format": "bestvideo+bestaudio/best",
        "outtmpl": outtmpl,
        "merge_output_format": "mp4",
        "quiet": False,
        "no_warnings": False,
        "nocheckcertificate": True,
        "extractor_retries": 3,
        "socket_timeout": 30,
    }

    # 3. yt-dlp ile indir
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(original_url, download=True)
    except (yt_dlp.utils.DownloadError, yt_dlp.utils.ExtractorError) as e:
        raise _NoRetryError(str(e)[:500])

    # 4. İndirilen dosyayı disk'te bul (.part ve .ytdl temp dosyaları atla)
    candidates = [
        f for f in videos_dir.glob(f"{video_id}.*")
        if f.suffix not in (".part", ".ytdl")
    ]
    if not candidates:
        raise _NoRetryError("İndirme tamamlandı fakat dosya disk'te bulunamadı.")
    video_full_path = str(candidates[0])
    actual_ext = candidates[0].suffix.lstrip(".")
    file_path = f"/media/videos/{video_id}.{actual_ext}"

    # 5. Thumbnail çıkar (ffmpeg)
    thumbnail_path_str = str(thumbnails_dir / f"{video_id}.jpg")
    thumb_result = subprocess.run(
        [
            "ffmpeg", "-i", video_full_path,
            "-ss", "00:00:01", "-vframes", "1",
            thumbnail_path_str, "-y",
        ],
        capture_output=True,
    )
    thumb_path: Optional[str] = (
        f"/media/thumbnails/{video_id}.jpg" if thumb_result.returncode == 0 else None
    )

    # 6. DB güncelle
    async with _task_db() as db:
        repo = VideoRepository(db)
        await repo.update_completed(uuid.UUID(video_id), file_path, thumb_path)


async def _mark_failed(video_id: str, error_message: str) -> None:
    async with _task_db() as db:
        repo = VideoRepository(db)
        await repo.update_failed(uuid.UUID(video_id), error_message)
