import uuid

from fastapi import APIRouter, HTTPException, Query

from abacus.domain.exceptions import LinkValidationError, NotFoundError
from abacus.presentation.dependencies import CurrentUser, TransactionServiceDep
from abacus.presentation.schemas.transaction_schemas import (
    AssetPnLSummary,
    AvailableBuyOut,
    AvailableBuysResponse,
    LinksUpdateRequest,
    PaginatedTransactions,
    TransactionCreate,
    TransactionLinkOut,
    TransactionOut,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _enrich(tx: object, links: list, pnl: object | None) -> TransactionOut:
    tx_out = TransactionOut.model_validate(tx)
    if pnl is not None:
        tx_out.realized_pnl = pnl.pnl
        tx_out.realized_pnl_pct = pnl.pnl_pct
        tx_out.cost_basis = pnl.cost_basis
        tx_out.unlinked_quantity = pnl.unlinked_quantity
        tx_out.links = [TransactionLinkOut.model_validate(lnk) for lnk in links]
    return tx_out


@router.post("/", response_model=TransactionOut, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    service: TransactionServiceDep,
    user_id: CurrentUser,
) -> TransactionOut:
    tx = await service.create_transaction(user_id, data.model_dump())
    return TransactionOut.model_validate(tx)


@router.get("/", response_model=PaginatedTransactions)
async def list_transactions(
    service: TransactionServiceDep,
    user_id: CurrentUser,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> PaginatedTransactions:
    enriched, total = await service.list_transactions_enriched(user_id, limit, offset)
    return PaginatedTransactions(
        items=[_enrich(tx, links, pnl) for tx, links, pnl in enriched],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{sell_id}/available-buys", response_model=AvailableBuysResponse)
async def get_available_buys(
    sell_id: uuid.UUID,
    service: TransactionServiceDep,
    user_id: CurrentUser,
) -> AvailableBuysResponse:
    try:
        sell, rows = await service.get_available_buys_for_sell(user_id, sell_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return AvailableBuysResponse(
        sell=TransactionOut.model_validate(sell),
        available_buys=[
            AvailableBuyOut(
                buy=TransactionOut.model_validate(buy),
                qty_available=qty_avail,
                qty_linked=qty_linked,
            )
            for buy, qty_avail, qty_linked in rows
        ],
    )


@router.get("/summary/by-asset", response_model=list[AssetPnLSummary])
async def get_summary_by_asset(
    service: TransactionServiceDep,
    user_id: CurrentUser,
) -> list[AssetPnLSummary]:
    rows = await service.compute_summary_by_asset(user_id)
    return [AssetPnLSummary(**row) for row in rows]


@router.put("/{sell_id}/links", response_model=TransactionOut)
async def update_sell_links(
    sell_id: uuid.UUID,
    body: LinksUpdateRequest,
    service: TransactionServiceDep,
    user_id: CurrentUser,
) -> TransactionOut:
    try:
        sell, links, pnl = await service.update_sell_links(user_id, sell_id, body.links)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except LinkValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return _enrich(sell, links, pnl)
