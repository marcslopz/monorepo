import os
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from mariland.domain.models.comment import Comment
from mariland.domain.models.piso import Piso
from mariland.domain.models.price_history import PriceHistory
from mariland.infrastructure.persistence.database import Base
from mariland.main import app

# ── Shared helpers ─────────────────────────────────────────────────────────────


def make_piso(**kwargs: Any) -> Piso:
    now = datetime.now(tz=UTC)
    defaults: dict[str, Any] = {
        "id": 1,
        "url": None,
        "imagen_url": None,
        "direccion": "Calle Falsa 123",
        "barrio": "Centre",
        "precio": 250000,
        "habitaciones": 3,
        "banos": 1,
        "metros": 80,
        "planta": "2",
        "ascensor": True,
        "parking": None,
        "certificacion_energetica": None,
        "orientacion": None,
        "contacto_nombre": None,
        "contacto_telefono": None,
        "contacto_inmobiliaria": None,
        "estado": "candidato",
        "extras": None,
        "notas": None,
        "created_at": now,
        "updated_at": now,
        "price_history": [],
        "comments": [],
    }
    return Piso(**(defaults | kwargs))


def make_price_history(**kwargs: Any) -> PriceHistory:
    defaults: dict[str, Any] = {
        "id": 1,
        "piso_id": 1,
        "precio": 250000,
        "notas": None,
        "fecha": datetime.now(tz=UTC),
    }
    return PriceHistory(**(defaults | kwargs))


def make_comment(**kwargs: Any) -> Comment:
    defaults: dict[str, Any] = {
        "id": 1,
        "piso_id": 1,
        "texto": "Un comentario de prueba",
        "fecha": datetime.now(tz=UTC),
    }
    return Comment(**(defaults | kwargs))


# ── Mock fixtures ──────────────────────────────────────────────────────────────


@pytest.fixture
def mock_piso_repository() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_price_repository() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_comment_repository() -> AsyncMock:
    return AsyncMock()


# ── Database fixtures (integration) ───────────────────────────────────────────


def _db_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://appuser:apppassword@postgres:5432/mariland_db",
    )


@pytest_asyncio.fixture
async def test_engine() -> Any:
    engine = create_async_engine(_db_url())
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
