from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


def _build_engine_url() -> tuple[str, dict[str, object]]:
    """Strip psycopg2-style SSL params and convert to asyncpg connect_args."""
    parsed = urlparse(settings.database_url)
    params = parse_qs(parsed.query)

    connect_args: dict[str, object] = {}
    sslmode = params.pop("sslmode", [None])[0]
    params.pop("channel_binding", None)

    if sslmode in ("require", "verify-ca", "verify-full"):
        connect_args["ssl"] = True

    clean_query = urlencode({k: v[0] for k, v in params.items()})
    clean_url = urlunparse(parsed._replace(query=clean_query))
    return clean_url, connect_args


_url, _connect_args = _build_engine_url()

engine = create_async_engine(
    _url,
    connect_args=_connect_args,
    echo=settings.environment == "development",
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
