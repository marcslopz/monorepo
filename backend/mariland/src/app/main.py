import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from urllib.parse import urlparse, urlunparse

from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.infrastructure.persistence.database import _build_engine_url, engine
from app.presentation.api.router import api_router, health_router
from app.presentation.middleware import add_cors_middleware, add_exception_handlers


async def _ensure_database() -> None:
    """Create the app database if it does not exist."""
    parsed = urlparse(settings.database_url)
    db_name = parsed.path.lstrip("/")
    admin_url, connect_args = _build_engine_url()
    admin_url = urlunparse(urlparse(admin_url)._replace(path="/postgres"))

    admin_engine = create_async_engine(
        admin_url, connect_args=connect_args, isolation_level="AUTOCOMMIT"
    )
    try:
        async with admin_engine.connect() as conn:
            result = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db"), {"db": db_name}
            )
            if not result.scalar():
                await conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    finally:
        await admin_engine.dispose()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(levelname)-8s %(name)s - %(message)s",
    )

    app = FastAPI(
        title="Mariland API",
        description="Tracker de pisos con arquitectura hexagonal",
        version="0.1.0",
        lifespan=lifespan,
    )

    add_cors_middleware(app)
    add_exception_handlers(app)

    app.include_router(health_router)
    app.include_router(api_router)

    return app


app = create_app()
