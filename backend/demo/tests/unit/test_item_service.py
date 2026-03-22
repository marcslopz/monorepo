import uuid
from unittest.mock import AsyncMock

import pytest

from demo.application.services.item_service import ItemService
from demo.domain.exceptions import NotFoundError
from tests.conftest import make_item


@pytest.fixture
def service(mock_repository: AsyncMock, mock_cache: AsyncMock) -> ItemService:
    return ItemService(repository=mock_repository, cache=mock_cache)


@pytest.mark.asyncio
async def test_get_item_returns_item(
    service: ItemService, mock_repository: AsyncMock, mock_cache: AsyncMock
) -> None:
    item = make_item(name="Widget")
    mock_repository.get_by_id.return_value = item
    mock_cache.get.return_value = None

    result = await service.get_item(item.id)

    assert result.id == item.id
    assert result.name == "Widget"
    mock_repository.get_by_id.assert_awaited_once_with(item.id)


@pytest.mark.asyncio
async def test_get_item_uses_cache(
    service: ItemService, mock_repository: AsyncMock, mock_cache: AsyncMock
) -> None:
    item = make_item(name="Cached Widget")
    mock_cache.get.return_value = item.model_dump(mode="json")

    result = await service.get_item(item.id)

    assert result.name == "Cached Widget"
    mock_repository.get_by_id.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_item_raises_not_found(
    service: ItemService, mock_repository: AsyncMock, mock_cache: AsyncMock
) -> None:
    mock_repository.get_by_id.return_value = None
    mock_cache.get.return_value = None

    with pytest.raises(NotFoundError) as exc_info:
        await service.get_item(uuid.uuid4())

    assert "Item" in str(exc_info.value)


@pytest.mark.asyncio
async def test_create_item(
    service: ItemService, mock_repository: AsyncMock, mock_cache: AsyncMock
) -> None:
    item = make_item(name="New Item", description="Desc")
    mock_repository.create.return_value = item

    result = await service.create_item(name="New Item", description="Desc")

    assert result.name == "New Item"
    mock_repository.create.assert_awaited_once_with(name="New Item", description="Desc")
    mock_cache.set.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_items(
    service: ItemService, mock_repository: AsyncMock, mock_cache: AsyncMock
) -> None:
    items = [make_item(name=f"Item {i}") for i in range(3)]
    mock_repository.list_all.return_value = items

    result = await service.list_items()

    assert len(result) == 3
    mock_repository.list_all.assert_awaited_once_with(limit=100, offset=0)


@pytest.mark.asyncio
async def test_delete_item_raises_not_found(
    service: ItemService, mock_repository: AsyncMock, mock_cache: AsyncMock
) -> None:
    mock_repository.delete.return_value = False

    with pytest.raises(NotFoundError):
        await service.delete_item(uuid.uuid4())


@pytest.mark.asyncio
async def test_update_item_invalidates_cache(
    service: ItemService, mock_repository: AsyncMock, mock_cache: AsyncMock
) -> None:
    item = make_item(name="Updated")
    mock_repository.update.return_value = item

    await service.update_item(item.id, name="Updated")

    mock_cache.delete.assert_awaited_once()
