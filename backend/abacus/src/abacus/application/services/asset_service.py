import uuid
from typing import Any

from abacus.domain.exceptions import StockSearchUnavailableError
from abacus.domain.models.asset import Asset
from abacus.domain.models.stock_search import StockSearchResult
from abacus.domain.ports.repositories import AssetRepository
from abacus.domain.ports.stock_search import StockSearchPort


class AssetService:
    def __init__(
        self,
        repository: AssetRepository,
        stock_search_port: StockSearchPort | None = None,
    ) -> None:
        self._repository = repository
        self._stock_search_port = stock_search_port

    async def list_assets(self, user_id: uuid.UUID) -> list[Asset]:
        return await self._repository.list_by_user(user_id)

    async def create_asset(self, user_id: uuid.UUID, data: dict[str, Any]) -> Asset:
        ticker = data.get("ticker")
        if ticker:
            existing = await self._repository.get_by_ticker(ticker, user_id)
            if existing:
                return existing
        data["user_id"] = user_id
        return await self._repository.create(data)

    async def search_stocks(self, query: str) -> list[StockSearchResult]:
        if self._stock_search_port is None:
            raise StockSearchUnavailableError("Stock search not configured")
        return await self._stock_search_port.search(query)
