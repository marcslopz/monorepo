from typing import Any
from unittest.mock import AsyncMock

import pytest

from abacus.application.services.asset_service import AssetService
from abacus.application.services.transaction_service import TransactionService
from abacus.main import app
from abacus.presentation.dependencies import get_asset_service, get_transaction_service
from tests.conftest import make_asset, make_transaction


@pytest.fixture(autouse=True)
def override_services(
    mock_asset_repository: AsyncMock, mock_transaction_repository: AsyncMock
) -> Any:
    """Override service dependencies with mock-backed instances."""

    def _asset_service() -> AssetService:
        return AssetService(repository=mock_asset_repository)

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
