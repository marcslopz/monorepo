from fastapi import APIRouter, Query

from abacus.presentation.dependencies import AssetServiceDep, CurrentUser
from abacus.presentation.schemas.asset_schemas import (
    AssetCreate,
    AssetOut,
    StockProfileOut,
    StockSearchResultOut,
)

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("/", response_model=AssetOut, status_code=201)
async def create_asset(
    data: AssetCreate,
    service: AssetServiceDep,
    user_id: CurrentUser,
) -> AssetOut:
    asset = await service.create_asset(user_id, data.model_dump())
    return AssetOut.model_validate(asset)


@router.get("/search", response_model=list[StockSearchResultOut])
async def search_assets(
    service: AssetServiceDep,
    user_id: CurrentUser,
    q: str = Query(min_length=1, max_length=64),
) -> list[StockSearchResultOut]:
    results = await service.search_stocks(q)
    return [StockSearchResultOut.model_validate(r, from_attributes=True) for r in results]


@router.get("/profile", response_model=StockProfileOut | None)
async def get_asset_profile(
    service: AssetServiceDep,
    user_id: CurrentUser,
    symbol: str = Query(min_length=1, max_length=32),
) -> StockProfileOut | None:
    profile = await service.get_stock_profile(symbol)
    return StockProfileOut.model_validate(profile, from_attributes=True) if profile else None


@router.get("/", response_model=list[AssetOut])
async def list_assets(
    service: AssetServiceDep,
    user_id: CurrentUser,
) -> list[AssetOut]:
    assets = await service.list_assets(user_id)
    return [AssetOut.model_validate(a) for a in assets]
