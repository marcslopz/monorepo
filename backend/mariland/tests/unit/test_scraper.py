from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.infrastructure.scraping.jina_anthropic_scraper import JinaAnthropicScraper


def make_tool_use_block(input_data: dict[str, Any]) -> MagicMock:
    block = MagicMock()
    block.type = "tool_use"
    block.name = "extract_piso"
    block.input = input_data
    return block


@pytest.fixture
def scraper() -> JinaAnthropicScraper:
    return JinaAnthropicScraper(anthropic_api_key="test-key")


@pytest.mark.asyncio
async def test_scrape_piso_returns_expected_fields(scraper: JinaAnthropicScraper) -> None:
    markdown = "## Piso en venta\nDirección: Calle Mayor 10\nPrecio: 250.000€\nHabitaciones: 3"
    extracted = {
        "direccion": "Calle Mayor 10",
        "precio": 250000,
        "habitaciones": 3,
        "banos": None,
        "metros": None,
    }

    with (
        patch.object(scraper, "_fetch_markdown", new=AsyncMock(return_value=markdown)),
        patch.object(scraper, "_extract_fields", new=AsyncMock(return_value=extracted)),
    ):
        result = await scraper.scrape_piso("https://fotocasa.es/piso/1")

    assert result["url"] == "https://fotocasa.es/piso/1"
    assert result["estado"] == "candidato"
    assert result["direccion"] == "Calle Mayor 10"
    assert result["precio"] == 250000


@pytest.mark.asyncio
async def test_scrape_piso_sets_url_and_estado(scraper: JinaAnthropicScraper) -> None:
    with (
        patch.object(scraper, "_fetch_markdown", new=AsyncMock(return_value="")),
        patch.object(scraper, "_extract_fields", new=AsyncMock(return_value={})),
    ):
        result = await scraper.scrape_piso("https://idealista.com/inmueble/99")

    assert result["url"] == "https://idealista.com/inmueble/99"
    assert result["estado"] == "candidato"


@pytest.mark.asyncio
async def test_extract_fields_parses_tool_use_response(scraper: JinaAnthropicScraper) -> None:
    tool_input = {"direccion": "Paseo de Gracia 1", "precio": 500000, "habitaciones": 4}
    mock_response = MagicMock()
    mock_response.content = [make_tool_use_block(tool_input)]

    mock_anthropic = AsyncMock()
    mock_anthropic.messages.create = AsyncMock(return_value=mock_response)
    scraper._anthropic = mock_anthropic

    result = await scraper._extract_fields("some markdown text")

    assert result["direccion"] == "Paseo de Gracia 1"
    assert result["precio"] == 500000
    mock_anthropic.messages.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_extract_fields_returns_empty_dict_when_no_tool_use(
    scraper: JinaAnthropicScraper,
) -> None:
    text_block = MagicMock()
    text_block.type = "text"

    mock_response = MagicMock()
    mock_response.content = [text_block]

    mock_anthropic = AsyncMock()
    mock_anthropic.messages.create = AsyncMock(return_value=mock_response)
    scraper._anthropic = mock_anthropic

    result = await scraper._extract_fields("some markdown text")

    assert result == {}
