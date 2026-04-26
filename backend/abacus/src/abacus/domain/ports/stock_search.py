from typing import Protocol

from abacus.domain.models.stock_search import StockSearchResult


class StockSearchPort(Protocol):
    async def search(self, query: str) -> list[StockSearchResult]: ...
