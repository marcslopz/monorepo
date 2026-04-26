from fastapi import APIRouter, Query

from abacus.presentation.dependencies import AssetServiceDep, CurrentUser
from abacus.presentation.schemas.asset_schemas import AssetCreate, AssetOut, StockSearchResultOut

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


@router.get("/", response_model=list[AssetOut])
async def list_assets(
    service: AssetServiceDep,
    user_id: CurrentUser,
) -> list[AssetOut]:
    assets = await service.list_assets(user_id)
    return [AssetOut.model_validate(a) for a in assets]
