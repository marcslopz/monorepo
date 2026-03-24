from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from mariland.domain.exceptions import FetchError
from mariland.infrastructure.scraping.jina_fetcher import JinaFetcher
from mariland.infrastructure.scraping.scrapingbee_fetcher import ScrapingBeeFetcher

# --- ScrapingBeeFetcher ---


@pytest.mark.asyncio
async def test_scrapingbee_fetcher_timeout_raises_fetch_error() -> None:
    fetcher = ScrapingBeeFetcher(api_key="test-key")
    with (
        patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=httpx.ReadTimeout("timeout"))),
        pytest.raises(FetchError, match="No se pudo obtener"),
    ):
        await fetcher.fetch_content("https://idealista.com/inmueble/1")


@pytest.mark.asyncio
async def test_scrapingbee_fetcher_http_status_error_raises_fetch_error() -> None:
    fetcher = ScrapingBeeFetcher(api_key="test-key")
    mock_response = MagicMock()
    mock_response.status_code = 500
    exc = httpx.HTTPStatusError("500", request=MagicMock(), response=mock_response)
    with (
        patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=exc)),
        pytest.raises(FetchError, match="Error HTTP 500"),
    ):
        await fetcher.fetch_content("https://idealista.com/inmueble/1")


@pytest.mark.asyncio
async def test_scrapingbee_fetcher_http_error_raises_fetch_error() -> None:
    fetcher = ScrapingBeeFetcher(api_key="test-key")
    with (
        patch(
            "httpx.AsyncClient.get", new=AsyncMock(side_effect=httpx.ConnectError("conn error"))
        ),
        pytest.raises(FetchError, match="Error de red"),
    ):
        await fetcher.fetch_content("https://idealista.com/inmueble/1")


@pytest.mark.asyncio
async def test_scrapingbee_fetcher_returns_text_on_success() -> None:
    fetcher = ScrapingBeeFetcher(api_key="test-key")
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "<html><body>Piso en venta</body></html>"
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_response)):
        result = await fetcher.fetch_content("https://idealista.com/inmueble/1")
    assert "Piso en venta" in result


# --- JinaFetcher ---


@pytest.mark.asyncio
async def test_jina_fetcher_timeout_raises_fetch_error() -> None:
    fetcher = JinaFetcher()
    with (
        patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=httpx.ReadTimeout("timeout"))),
        pytest.raises(FetchError, match="No se pudo obtener"),
    ):
        await fetcher.fetch_content("https://fotocasa.es/piso/1")


@pytest.mark.asyncio
async def test_jina_fetcher_http_status_error_raises_fetch_error() -> None:
    fetcher = JinaFetcher()
    mock_response = MagicMock()
    mock_response.status_code = 403
    exc = httpx.HTTPStatusError("403", request=MagicMock(), response=mock_response)
    with (
        patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=exc)),
        pytest.raises(FetchError, match="Error HTTP 403"),
    ):
        await fetcher.fetch_content("https://fotocasa.es/piso/1")


@pytest.mark.asyncio
async def test_jina_fetcher_http_error_raises_fetch_error() -> None:
    fetcher = JinaFetcher()
    with (
        patch(
            "httpx.AsyncClient.get", new=AsyncMock(side_effect=httpx.ConnectError("conn error"))
        ),
        pytest.raises(FetchError, match="Error de red"),
    ):
        await fetcher.fetch_content("https://fotocasa.es/piso/1")
