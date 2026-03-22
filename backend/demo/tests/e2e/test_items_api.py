import uuid
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from demo.application.services.item_service import ItemService
from demo.main import app
from demo.presentation.dependencies import get_item_service
from tests.conftest import make_item


@pytest.fixture
def mock_service() -> AsyncMock:
    return AsyncMock(spec=ItemService)


@pytest.fixture(autouse=True)
def override_service(mock_service: AsyncMock) -> None:
    app.dependency_overrides[get_item_service] = lambda: mock_service
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient) -> None:
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_list_items(async_client: AsyncClient, mock_service: AsyncMock) -> None:
    items = [make_item(name=f"Item {i}") for i in range(2)]
    mock_service.list_items.return_value = items

    response = await async_client.get("/api/v1/items")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_create_item(async_client: AsyncClient, mock_service: AsyncMock) -> None:
    item = make_item(name="New Item", description="Created via API")
    mock_service.create_item.return_value = item

    response = await async_client.post(
        "/api/v1/items",
        json={"name": "New Item", "description": "Created via API"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Item"
    mock_service.create_item.assert_awaited_once_with(
        name="New Item", description="Created via API"
    )


@pytest.mark.asyncio
async def test_get_item(async_client: AsyncClient, mock_service: AsyncMock) -> None:
    item = make_item(name="Get Me")
    mock_service.get_item.return_value = item

    response = await async_client.get(f"/api/v1/items/{item.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Get Me"


@pytest.mark.asyncio
async def test_get_item_not_found(async_client: AsyncClient, mock_service: AsyncMock) -> None:
    from demo.domain.exceptions import NotFoundError

    mock_service.get_item.side_effect = NotFoundError("Item", str(uuid.uuid4()))

    response = await async_client.get(f"/api/v1/items/{uuid.uuid4()}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_item(async_client: AsyncClient, mock_service: AsyncMock) -> None:
    mock_service.delete_item.return_value = None

    response = await async_client.delete(f"/api/v1/items/{uuid.uuid4()}")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_create_item_invalid_payload(
    async_client: AsyncClient, mock_service: AsyncMock
) -> None:
    response = await async_client.post("/api/v1/items", json={"name": ""})

    assert response.status_code == 422
