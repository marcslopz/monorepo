from typing import Any
from unittest.mock import AsyncMock

import pytest

from abacus.application.services.asset_service import AssetService
from abacus.application.services.transaction_service import TransactionService
from abacus.domain.models.asset import AssetClass
from abacus.domain.models.stock_search import StockSearchResult
from abacus.main import app
from abacus.presentation.dependencies import get_asset_service, get_transaction_service
from tests.conftest import make_asset, make_transaction


@pytest.fixture(autouse=True)
def override_services(
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
    mock_stock_search_port: AsyncMock,
) -> Any:
    """Override service dependencies with mock-backed instances."""

    def _asset_service() -> AssetService:
        return AssetService(
            repository=mock_asset_repository, stock_search_port=mock_stock_search_port
        )

    def _transaction_service() -> TransactionService:
        return TransactionService(
            asset_repository=mock_asset_repository,
            transaction_repository=mock_transaction_repository,
        )

    app.dependency_overrides[get_asset_service] = _asset_service
    app.dependency_overrides[get_transaction_service] = _transaction_service
    yield
    # auth override cleanup handled by async_client fixture


async def test_health(async_client: Any) -> None:
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_list_assets_empty(async_client: Any, mock_asset_repository: AsyncMock) -> None:
    mock_asset_repository.list_by_user.return_value = []

    response = await async_client.get("/api/assets/")
    assert response.status_code == 200
    assert response.json() == []


async def test_create_asset(async_client: Any, mock_asset_repository: AsyncMock) -> None:
    asset = make_asset()
    mock_asset_repository.get_by_ticker.return_value = None
    mock_asset_repository.create.return_value = asset

    payload = {
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "isin": None,
        "asset_class": "stock",
        "currency": "USD",
    }
    response = await async_client.post("/api/assets/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Apple Inc."
    assert data["asset_class"] == "stock"


async def test_list_transactions_empty(
    async_client: Any, mock_transaction_repository: AsyncMock
) -> None:
    mock_transaction_repository.list_by_user.return_value = []
    mock_transaction_repository.count_by_user.return_value = 0

    response = await async_client.get("/api/transactions/")
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


async def test_create_transaction(
    async_client: Any,
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
) -> None:
    asset = make_asset()
    tx = make_transaction()
    mock_asset_repository.get_by_id.return_value = asset
    mock_transaction_repository.create.return_value = tx

    payload = {
        "asset_id": str(tx.asset_id),
        "date": str(tx.date),
        "type": "buy",
        "quantity": "10",
        "price_per_unit": "150.00",
        "fee": "0",
        "broker": None,
        "notes": None,
    }
    response = await async_client.post("/api/transactions/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "buy"


async def test_search_assets_returns_results(
    async_client: Any, mock_stock_search_port: AsyncMock
) -> None:
    mock_stock_search_port.search.return_value = [
        StockSearchResult(ticker="AAPL", name="Apple Inc.", asset_class=AssetClass.STOCK)
    ]

    response = await async_client.get("/api/assets/search?q=AAPL")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["ticker"] == "AAPL"
    assert data[0]["name"] == "Apple Inc."
    assert data[0]["asset_class"] == "stock"


async def test_search_assets_requires_query(async_client: Any) -> None:
    response = await async_client.get("/api/assets/search")
    assert response.status_code == 422


async def test_create_asset_returns_existing_on_ticker_dupe(
    async_client: Any, mock_asset_repository: AsyncMock
) -> None:
    existing = make_asset()
    mock_asset_repository.get_by_ticker.return_value = existing

    payload = {
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "isin": None,
        "asset_class": "stock",
        "currency": "USD",
    }
    response = await async_client.post("/api/assets/", json=payload)

    assert response.status_code == 201
    assert response.json()["id"] == str(existing.id)
    mock_asset_repository.create.assert_not_called()
