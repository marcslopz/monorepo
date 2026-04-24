from fastapi import APIRouter

from abacus.presentation.api import assets, health, transactions

api_router = APIRouter(prefix="/api")
api_router.include_router(assets.router)
api_router.include_router(transactions.router)

health_router = APIRouter()
health_router.include_router(health.router)
