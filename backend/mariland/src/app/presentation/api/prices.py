from fastapi import APIRouter

from app.presentation.dependencies import PriceServiceDep
from app.presentation.schemas.piso_schemas import PriceHistoryCreate, PriceHistoryOut

router = APIRouter(prefix="/pisos", tags=["prices"])


@router.post("/{piso_id}/prices", response_model=PriceHistoryOut, status_code=201)
async def add_price(
    piso_id: int, data: PriceHistoryCreate, service: PriceServiceDep
) -> PriceHistoryOut:
    price = await service.add_price(piso_id, data.precio, data.notas)
    return PriceHistoryOut.model_validate(price)


@router.delete("/{piso_id}/prices/{price_id}", status_code=204)
async def delete_price(piso_id: int, price_id: int, service: PriceServiceDep) -> None:
    await service.delete_price(piso_id, price_id)
