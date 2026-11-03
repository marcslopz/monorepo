from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from abacus.main import create_app as create_abacus_app
from demo.main import create_app as create_demo_app
from flixseven.adapters.http.app import create_app as create_flixseven_app
from mariland.main import create_app as create_mariland_app


def create_app() -> FastAPI:
    flixseven = create_flixseven_app()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        # a mounted app's lifespan does not run by itself: FlixSeven's relays its live events
        async with flixseven.router.lifespan_context(flixseven):
            yield

    app = FastAPI(title="Gateway", docs_url=None, redoc_url=None, lifespan=lifespan)

    app.mount("/demo", create_demo_app())
    app.mount("/mariland", create_mariland_app())
    app.mount("/abacus", create_abacus_app())
    app.mount("/flixseven", flixseven)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
