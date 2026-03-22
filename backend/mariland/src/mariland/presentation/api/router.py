from fastapi import APIRouter

from mariland.presentation.api import comments, health, pisos, prices

api_router = APIRouter(prefix="/api")
api_router.include_router(pisos.router)
api_router.include_router(prices.router)
api_router.include_router(comments.router)

health_router = APIRouter()
health_router.include_router(health.router)
