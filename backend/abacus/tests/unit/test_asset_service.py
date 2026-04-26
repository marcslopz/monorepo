import uuid
from unittest.mock import AsyncMock

import pytest

from abacus.application.services.asset_service import AssetService
from abacus.domain.exceptions import StockSearchUnavailableError
from abacus.domain.models.asset import AssetClass
from abacus.domain.models.stock_search import StockSearchResult
from tests.conftest import TEST_USER_ID, make_asset


@pytest.fixture
def service(mock_asset_repository: AsyncMock) -> AssetService:
    return AssetService(repository=mock_asset_repository)


@pytest.fixture
def service_with_search(
    mock_asset_repository: AsyncMock, mock_stock_search_port: AsyncMock
) -> AssetService:
    return AssetService(repository=mock_asset_repository, stock_search_port=mock_stock_search_port)


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
    mock_asset_repository.get_by_ticker.return_value = None
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


async def test_create_asset_returns_existing_when_ticker_dupe(
    service: AssetService, mock_asset_repository: AsyncMock
) -> None:
    existing = make_asset()
    mock_asset_repository.get_by_ticker.return_value = existing

    data = {
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "isin": None,
        "asset_class": AssetClass.STOCK,
        "currency": "USD",
    }
    result = await service.create_asset(TEST_USER_ID, data)

    assert result == existing
    mock_asset_repository.create.assert_not_called()


async def test_create_asset_creates_when_no_dupe(
    service: AssetService, mock_asset_repository: AsyncMock
) -> None:
    asset = make_asset()
    mock_asset_repository.get_by_ticker.return_value = None
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
    mock_asset_repository.create.assert_called_once()


async def test_create_asset_skips_dedupe_when_no_ticker(
    service: AssetService, mock_asset_repository: AsyncMock
) -> None:
    asset = make_asset(ticker=None)
    mock_asset_repository.create.return_value = asset

    data = {
        "name": "Fondo sin ticker",
        "ticker": None,
        "isin": None,
        "asset_class": AssetClass.FUND,
        "currency": "EUR",
    }
    await service.create_asset(TEST_USER_ID, data)

    mock_asset_repository.get_by_ticker.assert_not_called()


async def test_search_stocks_delegates_to_port(
    service_with_search: AssetService, mock_stock_search_port: AsyncMock
) -> None:
    results = [StockSearchResult(ticker="AAPL", name="Apple Inc.", asset_class=AssetClass.STOCK)]
    mock_stock_search_port.search.return_value = results

    result = await service_with_search.search_stocks("AAPL")

    assert result == results
    mock_stock_search_port.search.assert_called_once_with("AAPL")


async def test_search_stocks_raises_when_no_port(service: AssetService) -> None:
    with pytest.raises(StockSearchUnavailableError):
        await service.search_stocks("AAPL")
