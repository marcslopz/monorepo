import httpx
from cachetools import TTLCache

from abacus.domain.exceptions import ExternalServiceError
from abacus.domain.models.asset import AssetClass
from abacus.domain.models.stock_search import StockSearchResult

_TYPE_MAP: dict[str, AssetClass] = {
    "Common Stock": AssetClass.STOCK,
    "ETP": AssetClass.ETF,
    "Crypto": AssetClass.CRYPTO,
    "Fund": AssetClass.FUND,
}


class FinnhubStockSearchClient:
    def __init__(self, api_key: str, base_url: str) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._cache: TTLCache[str, list[StockSearchResult]] = TTLCache(maxsize=256, ttl=600)

    async def search(self, query: str) -> list[StockSearchResult]:
        cache_key = query.strip().lower()
        if cache_key in self._cache:
            return self._cache[cache_key]

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self._base_url}/search",
                    params={"q": query, "token": self._api_key},
                    timeout=10.0,
                )
                resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ExternalServiceError(f"Finnhub error: {exc}") from exc
        except httpx.RequestError as exc:
            raise ExternalServiceError(f"Finnhub request failed: {exc}") from exc

        results = [
            StockSearchResult(
                ticker=item["symbol"],
                name=item["description"],
                asset_class=_TYPE_MAP.get(item.get("type", ""), AssetClass.STOCK),
            )
            for item in resp.json().get("result", [])
        ]
        self._cache[cache_key] = results
        return results
