import uuid
from datetime import datetime, timezone
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.categories import CategoryCreate, CategoryOut
from app.schemas.videos import VideoCreate, VideoOut, VideoPage
from app.models.video import VideoStatus


def test_login_request():
    req = LoginRequest(username="admin", password="secret")
    assert req.username == "admin"


def test_token_response():
    resp = TokenResponse(access_token="tok")
    assert resp.token_type == "bearer"


def test_category_create():
    cat = CategoryCreate(name="Movies", slug="movies")
    assert cat.slug == "movies"


def test_category_out_from_orm():
    class FakeCategory:
        id = uuid.uuid4()
        name = "Movies"
        slug = "movies"
    out = CategoryOut.model_validate(FakeCategory())
    assert out.name == "Movies"


def test_video_create():
    vc = VideoCreate(title="Test", original_url="https://example.com/v")
    assert vc.category_id is None


def test_video_page():
    page = VideoPage(items=[], total=0, page=1, limit=20, pages=0)
    assert page.pages == 0
