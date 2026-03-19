from app.domain.exceptions import NotFoundError
from app.domain.models.price_history import PriceHistory
from app.domain.ports.repositories import PisoRepository, PriceHistoryRepository


class PriceService:
    def __init__(
        self,
        piso_repository: PisoRepository,
        price_repository: PriceHistoryRepository,
    ) -> None:
        self._piso_repository = piso_repository
        self._price_repository = price_repository

    async def add_price(self, piso_id: int, precio: int, notas: str | None) -> PriceHistory:
        piso = await self._piso_repository.get_by_id(piso_id)
        if piso is None:
            raise NotFoundError("Piso", str(piso_id))
        return await self._price_repository.add(piso_id, precio, notas)

    async def delete_price(self, piso_id: int, price_id: int) -> None:
        deleted = await self._price_repository.delete(piso_id, price_id)
        if not deleted:
            raise NotFoundError("PriceHistory", str(price_id))
