from abacus.domain.exceptions import StockSearchUnavailableError
from abacus.domain.models.stock_search import StockSearchResult


class NoopStockSearch:
    async def search(self, query: str) -> list[StockSearchResult]:
        raise StockSearchUnavailableError(
            "Stock search not configured (ABACUS_FINNHUB_API_KEY missing)"
        )
