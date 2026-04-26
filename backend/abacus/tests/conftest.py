import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from abacus.domain.models.asset import Asset, AssetClass
from abacus.domain.models.transaction import Transaction, TransactionType
from abacus.infrastructure.auth.dependencies import get_current_user_id
from abacus.main import app

# ── Fixed UUIDs ───────────────────────────────────────────────────────────────

TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TEST_ASSET_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")

# ── Shared helpers ─────────────────────────────────────────────────────────────


def make_asset(**kwargs: Any) -> Asset:
    now = datetime.now(tz=UTC)
    defaults: dict[str, Any] = {
        "id": TEST_ASSET_ID,
        "user_id": TEST_USER_ID,
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "isin": None,
        "asset_class": AssetClass.STOCK,
        "currency": "USD",
        "created_at": now,
        "updated_at": now,
    }
    return Asset(**(defaults | kwargs))


def make_transaction(**kwargs: Any) -> Transaction:
    now = datetime.now(tz=UTC)
    defaults: dict[str, Any] = {
        "id": uuid.uuid4(),
        "user_id": TEST_USER_ID,
        "asset_id": TEST_ASSET_ID,
        "date": date.today(),
        "type": TransactionType.BUY,
        "quantity": Decimal("10"),
        "price_per_unit": Decimal("150.00"),
        "fee": Decimal("0"),
        "broker": None,
        "notes": None,
        "created_at": now,
        "updated_at": now,
    }
    return Transaction(**(defaults | kwargs))


# ── Mock fixtures ──────────────────────────────────────────────────────────────


@pytest.fixture
def mock_asset_repository() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_transaction_repository() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_stock_search_port() -> AsyncMock:
    return AsyncMock()


# ── HTTP client fixtures ───────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def async_client() -> Any:
    # Override auth dependency to always return the test user UUID
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
