from fastapi import APIRouter

from demo.presentation.api import health, items

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(items.router)

# Health is mounted at root (no /api/v1 prefix)
health_router = APIRouter()
health_router.include_router(health.router)
