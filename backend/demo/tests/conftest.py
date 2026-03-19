import uuid
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.domain.models.item import Item
from app.infrastructure.persistence.database import Base, get_session
from app.main import app
from app.presentation.dependencies import get_item_service


# ── Shared fixtures ────────────────────────────────────────────────────────────

def make_item(**kwargs: Any) -> Item:
    now = datetime.now(tz=timezone.utc)
    defaults: dict[str, Any] = {
        "id": uuid.uuid4(),
        "name": "Test Item",
        "description": "A test item",
        "created_at": now,
        "updated_at": now,
    }
    return Item(**(defaults | kwargs))


# ── Mock fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture
def mock_repository() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_cache() -> AsyncMock:
    cache = AsyncMock()
    cache.get.return_value = None
    return cache


# ── Database fixtures (integration) ───────────────────────────────────────────

TEST_DATABASE_URL = "postgresql+asyncpg://appuser:apppassword@postgres:5432/appdb_test"


@pytest_asyncio.fixture(scope="session")
async def test_engine() -> Any:
    import os
    db_url = os.environ.get("DATABASE_URL", TEST_DATABASE_URL)
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine: Any) -> Any:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


# ── HTTP client fixtures ───────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def async_client() -> Any:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
