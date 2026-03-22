from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from mariland.domain.exceptions import ScrapingError
from mariland.infrastructure.scraping.llm_scraper import LlmScraper


def make_tool_use_block(input_data: dict[str, Any]) -> MagicMock:
    block = MagicMock()
    block.type = "tool_use"
    block.name = "extract_piso"
    block.input = input_data
    return block


@pytest.fixture
def mock_fetcher() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def scraper(mock_fetcher: AsyncMock) -> LlmScraper:
    return LlmScraper(fetcher=mock_fetcher, anthropic_api_key="test-key")


@pytest.mark.asyncio
async def test_scrape_piso_returns_expected_fields(
    scraper: LlmScraper, mock_fetcher: AsyncMock
) -> None:
    mock_fetcher.fetch_content.return_value = "x" * 3000
    extracted = {"direccion": "Calle Mayor 10", "precio": 250000, "habitaciones": 3}

    with patch.object(scraper, "_extract_fields", new=AsyncMock(return_value=extracted)):
        result = await scraper.scrape_piso("https://fotocasa.es/piso/1")

    assert result["url"] == "https://fotocasa.es/piso/1"
    assert result["estado"] == "candidato"
    assert result["direccion"] == "Calle Mayor 10"
    assert result["precio"] == 250000
    mock_fetcher.fetch_content.assert_awaited_once_with("https://fotocasa.es/piso/1")


@pytest.mark.asyncio
async def test_scrape_piso_raises_when_content_too_short(
    scraper: LlmScraper, mock_fetcher: AsyncMock
) -> None:
    mock_fetcher.fetch_content.return_value = "too short"

    with pytest.raises(ScrapingError, match="No se ha podido obtener"):
        await scraper.scrape_piso("https://fotocasa.es/piso/1")


@pytest.mark.asyncio
async def test_scrape_piso_sets_url_and_estado(
    scraper: LlmScraper, mock_fetcher: AsyncMock
) -> None:
    mock_fetcher.fetch_content.return_value = "x" * 3000

    with patch.object(scraper, "_extract_fields", new=AsyncMock(return_value={})):
        result = await scraper.scrape_piso("https://idealista.com/inmueble/99")

    assert result["url"] == "https://idealista.com/inmueble/99"
    assert result["estado"] == "candidato"


@pytest.mark.asyncio
async def test_extract_fields_parses_tool_use_response(scraper: LlmScraper) -> None:
    tool_input = {"direccion": "Paseo de Gracia 1", "precio": 500000, "habitaciones": 4}
    mock_response = MagicMock()
    mock_response.content = [make_tool_use_block(tool_input)]

    mock_anthropic = AsyncMock()
    mock_anthropic.messages.create = AsyncMock(return_value=mock_response)
    scraper._anthropic = mock_anthropic

    result = await scraper._extract_fields("some content")

    assert result["direccion"] == "Paseo de Gracia 1"
    assert result["precio"] == 500000
    mock_anthropic.messages.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_extract_fields_returns_empty_dict_when_no_tool_use(scraper: LlmScraper) -> None:
    text_block = MagicMock()
    text_block.type = "text"

    mock_response = MagicMock()
    mock_response.content = [text_block]

    mock_anthropic = AsyncMock()
    mock_anthropic.messages.create = AsyncMock(return_value=mock_response)
    scraper._anthropic = mock_anthropic

    result = await scraper._extract_fields("some content")

    assert result == {}
