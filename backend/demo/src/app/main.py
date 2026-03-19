import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from alembic import command
from alembic.config import Config
from fastapi import FastAPI

from app.infrastructure.persistence.database import engine
from app.presentation.api.router import api_router, health_router
from app.presentation.middleware import add_cors_middleware, add_exception_handlers


def _run_migrations() -> None:
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    await asyncio.to_thread(_run_migrations)
    yield
    # Shutdown
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="App Template API",
        description="FastAPI backend with hexagonal architecture",
        version="0.1.0",
        lifespan=lifespan,
    )

    add_cors_middleware(app)
    add_exception_handlers(app)

    app.include_router(health_router)
    app.include_router(api_router)

    return app


app = create_app()
