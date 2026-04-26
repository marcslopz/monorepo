from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from abacus.domain.models.asset import AssetClass
from abacus.infrastructure.external.finnhub_client import FinnhubStockSearchClient

FINNHUB_RESPONSE = {
    "count": 2,
    "result": [
        {
            "description": "APPLE INC",
            "displaySymbol": "AAPL",
            "symbol": "AAPL",
            "type": "Common Stock",
        },
        {
            "description": "ISHARES CORE S&P 500 ETF",
            "displaySymbol": "IVV",
            "symbol": "IVV",
            "type": "ETP",
        },
    ],
}


def _make_client() -> FinnhubStockSearchClient:
    return FinnhubStockSearchClient(api_key="test_key", base_url="https://finnhub.io/api/v1")


def _mock_httpx(response_json: dict) -> tuple[MagicMock, AsyncMock]:
    mock_response = MagicMock()
    mock_response.json.return_value = response_json
    mock_response.raise_for_status = MagicMock()

    mock_http_client = AsyncMock()
    mock_http_client.get.return_value = mock_response

    mock_ctx = MagicMock()
    mock_ctx.__aenter__ = AsyncMock(return_value=mock_http_client)
    mock_ctx.__aexit__ = AsyncMock(return_value=False)

    return mock_ctx, mock_http_client


async def test_search_parses_finnhub_response() -> None:
    client = _make_client()
    mock_ctx, _ = _mock_httpx(FINNHUB_RESPONSE)

    with patch("httpx.AsyncClient", return_value=mock_ctx):
        results = await client.search("AAPL")

    assert len(results) == 2
    assert results[0].ticker == "AAPL"
    assert results[0].name == "APPLE INC"
    assert results[0].asset_class == AssetClass.STOCK
    assert results[1].ticker == "IVV"
    assert results[1].asset_class == AssetClass.ETF


async def test_search_maps_unknown_type_to_stock() -> None:
    client = _make_client()
    response = {
        "count": 1,
        "result": [
            {
                "description": "SOME THING",
                "displaySymbol": "XYZ",
                "symbol": "XYZ",
                "type": "Unknown",
            }
        ],
    }
    mock_ctx, _ = _mock_httpx(response)

    with patch("httpx.AsyncClient", return_value=mock_ctx):
        results = await client.search("XYZ")

    assert results[0].asset_class == AssetClass.STOCK


async def test_search_caches_repeated_query() -> None:
    client = _make_client()
    mock_ctx, mock_http_client = _mock_httpx(FINNHUB_RESPONSE)

    with patch("httpx.AsyncClient", return_value=mock_ctx):
        await client.search("aapl")
        await client.search("AAPL")  # same query, normalised

    assert mock_http_client.get.call_count == 1


async def test_search_returns_empty_on_no_results() -> None:
    client = _make_client()
    mock_ctx, _ = _mock_httpx({"count": 0, "result": []})

    with patch("httpx.AsyncClient", return_value=mock_ctx):
        results = await client.search("zzznothing")

    assert results == []


async def test_search_raises_external_service_error_on_http_failure() -> None:
    from abacus.domain.exceptions import ExternalServiceError

    client = _make_client()
    import httpx

    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "500", request=MagicMock(), response=MagicMock()
    )

    mock_http_client = AsyncMock()
    mock_http_client.get.return_value = mock_response

    mock_ctx = MagicMock()
    mock_ctx.__aenter__ = AsyncMock(return_value=mock_http_client)
    mock_ctx.__aexit__ = AsyncMock(return_value=False)

    with patch("httpx.AsyncClient", return_value=mock_ctx), pytest.raises(ExternalServiceError):
        await client.search("AAPL")
