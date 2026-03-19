from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.price_history import PriceHistory
from app.infrastructure.persistence.models import PriceHistoryModel


class SQLAlchemyPriceHistoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, piso_id: int, precio: int, notas: str | None) -> PriceHistory:
        price = PriceHistoryModel(piso_id=piso_id, precio=precio, notas=notas)
        self._session.add(price)
        await self._session.flush()
        await self._session.refresh(price)
        return PriceHistory.model_validate(price)

    async def delete(self, piso_id: int, price_id: int) -> bool:
        result = await self._session.execute(
            select(PriceHistoryModel).where(
                PriceHistoryModel.id == price_id,
                PriceHistoryModel.piso_id == piso_id,
            )
        )
        price = result.scalar_one_or_none()
        if price is None:
            return False
        await self._session.delete(price)
        await self._session.flush()
        return True
