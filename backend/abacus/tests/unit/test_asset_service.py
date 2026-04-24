import uuid
from unittest.mock import AsyncMock

import pytest

from abacus.application.services.asset_service import AssetService
from abacus.domain.models.asset import AssetClass
from tests.conftest import TEST_USER_ID, make_asset


@pytest.fixture
def service(mock_asset_repository: AsyncMock) -> AssetService:
    return AssetService(repository=mock_asset_repository)


async def test_list_assets_returns_user_assets(
    service: AssetService, mock_asset_repository: AsyncMock
) -> None:
    asset = make_asset()
    mock_asset_repository.list_by_user.return_value = [asset]

    result = await service.list_assets(TEST_USER_ID)

    assert result == [asset]
    mock_asset_repository.list_by_user.assert_called_once_with(TEST_USER_ID)


async def test_create_asset_injects_user_id(
    service: AssetService, mock_asset_repository: AsyncMock
) -> None:
    asset = make_asset()
    mock_asset_repository.create.return_value = asset

    data = {
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "isin": None,
        "asset_class": AssetClass.STOCK,
        "currency": "USD",
    }
    result = await service.create_asset(TEST_USER_ID, data)

    assert result == asset
    call_data = mock_asset_repository.create.call_args[0][0]
    assert call_data["user_id"] == TEST_USER_ID


async def test_list_assets_empty(service: AssetService, mock_asset_repository: AsyncMock) -> None:
    mock_asset_repository.list_by_user.return_value = []

    result = await service.list_assets(uuid.uuid4())

    assert result == []
