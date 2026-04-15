import uuid
from app.models.admin import Admin
from app.models.category import Category
from app.models.video import Video, VideoStatus


def test_admin_model_fields():
    admin = Admin(id=uuid.uuid4(), username="admin", hashed_password="hashed")
    assert admin.username == "admin"


def test_category_model_fields():
    cat = Category(id=uuid.uuid4(), name="Movies", slug="movies")
    assert cat.slug == "movies"


def test_video_model_default_status():
    video = Video(
        id=uuid.uuid4(),
        title="Test",
        original_url="https://example.com/video",
        status=VideoStatus.PENDING,
    )
    assert video.status == VideoStatus.PENDING


def test_video_status_enum_values():
    assert VideoStatus.PENDING == "pending"
    assert VideoStatus.PROCESSING == "processing"
    assert VideoStatus.COMPLETED == "completed"
    assert VideoStatus.FAILED == "failed"
