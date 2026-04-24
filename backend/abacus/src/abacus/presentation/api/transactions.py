from fastapi import APIRouter, Query

from abacus.presentation.dependencies import CurrentUser, TransactionServiceDep
from abacus.presentation.schemas.transaction_schemas import (
    PaginatedTransactions,
    TransactionCreate,
    TransactionOut,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


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
    items, total = await service.list_transactions(user_id, limit, offset)
    return PaginatedTransactions(
        items=[TransactionOut.model_validate(tx) for tx in items],
        total=total,
        limit=limit,
        offset=offset,
    )
