from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.application.services.comment_service import CommentService
from app.application.services.piso_service import PisoService
from app.application.services.price_service import PriceService
from app.domain.exceptions import NotFoundError
from app.main import app
from app.presentation.dependencies import get_comment_service, get_piso_service, get_price_service
from tests.conftest import make_comment, make_piso, make_price_history


@pytest.fixture
def mock_piso_svc() -> AsyncMock:
    return AsyncMock(spec=PisoService)


@pytest.fixture
def mock_price_svc() -> AsyncMock:
    return AsyncMock(spec=PriceService)


@pytest.fixture
def mock_comment_svc() -> AsyncMock:
    return AsyncMock(spec=CommentService)


@pytest.fixture(autouse=True)
def override_services(
    mock_piso_svc: AsyncMock,
    mock_price_svc: AsyncMock,
    mock_comment_svc: AsyncMock,
) -> None:
    app.dependency_overrides[get_piso_service] = lambda: mock_piso_svc
    app.dependency_overrides[get_price_service] = lambda: mock_price_svc
    app.dependency_overrides[get_comment_service] = lambda: mock_comment_svc
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health(async_client: AsyncClient) -> None:
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_list_pisos(async_client: AsyncClient, mock_piso_svc: AsyncMock) -> None:
    mock_piso_svc.list_pisos.return_value = [make_piso(id=1), make_piso(id=2)]

    response = await async_client.get("/api/pisos/")

    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_create_piso(async_client: AsyncClient, mock_piso_svc: AsyncMock) -> None:
    piso = make_piso(id=1, direccion="Calle Nueva 1", precio=300000)
    mock_piso_svc.create_piso.return_value = piso

    response = await async_client.post(
        "/api/pisos/",
        json={"direccion": "Calle Nueva 1", "precio": 300000, "estado": "candidato"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["direccion"] == "Calle Nueva 1"
    assert data["precio"] == 300000


@pytest.mark.asyncio
async def test_get_piso(async_client: AsyncClient, mock_piso_svc: AsyncMock) -> None:
    piso = make_piso(id=5, direccion="Test Street")
    mock_piso_svc.get_piso.return_value = piso

    response = await async_client.get("/api/pisos/5")

    assert response.status_code == 200
    assert response.json()["direccion"] == "Test Street"


@pytest.mark.asyncio
async def test_get_piso_not_found(async_client: AsyncClient, mock_piso_svc: AsyncMock) -> None:
    mock_piso_svc.get_piso.side_effect = NotFoundError("Piso", "999")

    response = await async_client.get("/api/pisos/999")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_piso(async_client: AsyncClient, mock_piso_svc: AsyncMock) -> None:
    piso = make_piso(id=1, estado="visitado", precio=190000)
    mock_piso_svc.update_piso.return_value = piso

    response = await async_client.put(
        "/api/pisos/1", json={"estado": "visitado", "precio": 190000}
    )

    assert response.status_code == 200
    assert response.json()["estado"] == "visitado"


@pytest.mark.asyncio
async def test_delete_piso(async_client: AsyncClient, mock_piso_svc: AsyncMock) -> None:
    mock_piso_svc.delete_piso.return_value = None

    response = await async_client.delete("/api/pisos/1")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_add_comment(async_client: AsyncClient, mock_comment_svc: AsyncMock) -> None:
    comment = make_comment(id=1, piso_id=1, texto="Gran piso")
    mock_comment_svc.add_comment.return_value = comment

    response = await async_client.post("/api/pisos/1/comments", json={"texto": "Gran piso"})

    assert response.status_code == 201
    assert response.json()["texto"] == "Gran piso"


@pytest.mark.asyncio
async def test_delete_comment(async_client: AsyncClient, mock_comment_svc: AsyncMock) -> None:
    mock_comment_svc.delete_comment.return_value = None

    response = await async_client.delete("/api/pisos/1/comments/1")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_add_price(async_client: AsyncClient, mock_price_svc: AsyncMock) -> None:
    price = make_price_history(id=1, piso_id=1, precio=230000, notas="Oferta")
    mock_price_svc.add_price.return_value = price

    response = await async_client.post(
        "/api/pisos/1/prices", json={"precio": 230000, "notas": "Oferta"}
    )

    assert response.status_code == 201
    assert response.json()["precio"] == 230000


@pytest.mark.asyncio
async def test_delete_price(async_client: AsyncClient, mock_price_svc: AsyncMock) -> None:
    mock_price_svc.delete_price.return_value = None

    response = await async_client.delete("/api/pisos/1/prices/1")

    assert response.status_code == 204
