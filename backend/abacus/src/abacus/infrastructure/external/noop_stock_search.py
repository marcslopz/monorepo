from abacus.domain.exceptions import StockSearchUnavailableError
from abacus.domain.models.stock_search import StockProfile, StockSearchResult


class NoopStockSearch:
    async def search(self, query: str) -> list[StockSearchResult]:
        raise StockSearchUnavailableError(
            "Stock search not configured (ABACUS_FINNHUB_API_KEY missing)"
        )

    async def get_profile(self, symbol: str) -> StockProfile | None:
        raise StockSearchUnavailableError(
            "Stock search not configured (ABACUS_FINNHUB_API_KEY missing)"
        )
