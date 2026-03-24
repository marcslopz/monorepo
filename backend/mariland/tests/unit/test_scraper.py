from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import anthropic
import pytest

from mariland.domain.exceptions import ExtractionError, FetchError, ScrapingError
from mariland.infrastructure.scraping.llm_scraper import LlmScraper
from mariland.presentation.schemas.sse_events import DoneEvent, ErrorEvent, ProgressEvent


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


@pytest.mark.asyncio
async def test_extract_fields_raises_extraction_error_on_api_timeout(
    scraper: LlmScraper,
) -> None:
    mock_anthropic = AsyncMock()
    mock_anthropic.messages.create = AsyncMock(
        side_effect=anthropic.APITimeoutError(request=MagicMock())
    )
    scraper._anthropic = mock_anthropic

    with pytest.raises(ExtractionError, match="Timeout"):
        await scraper._extract_fields("some content")


@pytest.mark.asyncio
async def test_extract_fields_raises_extraction_error_on_api_status_error(
    scraper: LlmScraper,
) -> None:
    mock_anthropic = AsyncMock()
    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_anthropic.messages.create = AsyncMock(
        side_effect=anthropic.APIStatusError("rate limit", response=mock_response, body=None)
    )
    scraper._anthropic = mock_anthropic

    with pytest.raises(ExtractionError, match="429"):
        await scraper._extract_fields("some content")


@pytest.mark.asyncio
async def test_extract_fields_raises_extraction_error_on_connection_error(
    scraper: LlmScraper,
) -> None:
    mock_anthropic = AsyncMock()
    mock_anthropic.messages.create = AsyncMock(
        side_effect=anthropic.APIConnectionError(request=MagicMock())
    )
    scraper._anthropic = mock_anthropic

    with pytest.raises(ExtractionError, match="conexión"):
        await scraper._extract_fields("some content")


# --- scrape_piso_stream ---


async def collect_events(scraper: LlmScraper, url: str) -> list:
    return [event async for event in scraper.scrape_piso_stream(url)]


@pytest.mark.asyncio
async def test_scrape_piso_stream_emits_progress_and_done(
    scraper: LlmScraper, mock_fetcher: AsyncMock
) -> None:
    mock_fetcher.fetch_content.return_value = "x" * 3000
    extracted = {"direccion": "Calle Mayor 1", "precio": 200000}
    with patch.object(scraper, "_extract_fields", new=AsyncMock(return_value=extracted)):
        events = await collect_events(scraper, "https://fotocasa.es/piso/1")

    progress_steps = [e.step for e in events if isinstance(e, ProgressEvent)]
    assert progress_steps == ["fetching", "extracting"]
    assert isinstance(events[-1], DoneEvent)
    assert events[-1].piso["url"] == "https://fotocasa.es/piso/1"
    assert events[-1].piso["estado"] == "candidato"
    assert events[-1].piso["precio"] == 200000


@pytest.mark.asyncio
async def test_scrape_piso_stream_emits_error_on_fetch_failure(
    scraper: LlmScraper, mock_fetcher: AsyncMock
) -> None:
    mock_fetcher.fetch_content.side_effect = FetchError("Timeout al obtener la página")
    events = await collect_events(scraper, "https://idealista.com/inmueble/1")

    assert len(events) == 2
    assert isinstance(events[0], ProgressEvent)
    assert events[0].step == "fetching"
    assert isinstance(events[1], ErrorEvent)
    assert events[1].step == "fetching"
    assert "Timeout" in events[1].message


@pytest.mark.asyncio
async def test_scrape_piso_stream_emits_error_on_insufficient_content(
    scraper: LlmScraper, mock_fetcher: AsyncMock
) -> None:
    mock_fetcher.fetch_content.return_value = "too short"
    events = await collect_events(scraper, "https://idealista.com/inmueble/1")

    error_events = [e for e in events if isinstance(e, ErrorEvent)]
    assert len(error_events) == 1
    assert error_events[0].step == "fetching"


@pytest.mark.asyncio
async def test_scrape_piso_stream_emits_error_on_extraction_failure(
    scraper: LlmScraper, mock_fetcher: AsyncMock
) -> None:
    mock_fetcher.fetch_content.return_value = "x" * 3000
    with patch.object(
        scraper,
        "_extract_fields",
        new=AsyncMock(side_effect=ExtractionError("Error de IA")),
    ):
        events = await collect_events(scraper, "https://fotocasa.es/piso/1")

    progress_steps = [e.step for e in events if isinstance(e, ProgressEvent)]
    assert "fetching" in progress_steps
    assert "extracting" in progress_steps
    error_events = [e for e in events if isinstance(e, ErrorEvent)]
    assert len(error_events) == 1
    assert error_events[0].step == "extracting"
    assert "IA" in error_events[0].message
