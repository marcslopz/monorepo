from fastapi import FastAPI

from abacus.main import create_app as create_abacus_app
from demo.main import create_app as create_demo_app
from mariland.main import create_app as create_mariland_app


def create_app() -> FastAPI:
    app = FastAPI(title="Gateway", docs_url=None, redoc_url=None)

    app.mount("/demo", create_demo_app())
    app.mount("/mariland", create_mariland_app())
    app.mount("/abacus", create_abacus_app())

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
