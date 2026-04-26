from typing import Protocol

from abacus.domain.models.stock_search import StockProfile, StockSearchResult


class StockSearchPort(Protocol):
    async def search(self, query: str) -> list[StockSearchResult]: ...

    async def get_profile(self, symbol: str) -> StockProfile | None: ...
