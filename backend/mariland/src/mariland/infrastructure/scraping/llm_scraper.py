import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

import anthropic
from anthropic import AsyncAnthropic
from anthropic.types import ToolParam

from mariland.domain.exceptions import ExtractionError, ScrapingError
from mariland.domain.ports.fetcher import UrlFetcherPort
from mariland.presentation.schemas.sse_events import DoneEvent, ErrorEvent, ProgressEvent, SseEvent

logger = logging.getLogger(__name__)

MIN_CONTENT_CHARS = 2000

EXTRACT_TOOL: ToolParam = {
    "name": "extract_piso",
    "description": (
        "Extract property listing data from the provided text. "
        "Set only fields that are clearly present in the text. Leave others as null."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "direccion": {"type": ["string", "null"], "description": "Full address"},
            "barrio": {"type": ["string", "null"], "description": "Neighborhood or district"},
            "precio": {"type": ["integer", "null"], "description": "Price in euros (integer)"},
            "habitaciones": {"type": ["integer", "null"], "description": "Number of bedrooms"},
            "banos": {"type": ["integer", "null"], "description": "Number of bathrooms"},
            "metros": {"type": ["integer", "null"], "description": "Surface area in m²"},
            "planta": {"type": ["string", "null"], "description": "Floor (e.g. '3º', 'Bajo')"},
            "ascensor": {"type": ["boolean", "null"], "description": "Has elevator"},
            "parking": {
                "type": ["integer", "null"],
                "description": "Number of parking spaces (0 if none mentioned)",
            },
            "certificacion_energetica": {
                "type": ["string", "null"],
                "description": "Energy certification (A, B, C, D, E, F, G)",
            },
            "orientacion": {
                "type": ["string", "null"],
                "description": "Orientation (Norte, Sur, Este, Oeste, etc.)",
            },
            "contacto_nombre": {"type": ["string", "null"], "description": "Contact person name"},
            "contacto_telefono": {
                "type": ["string", "null"],
                "description": "Contact phone number",
            },
            "contacto_inmobiliaria": {
                "type": ["string", "null"],
                "description": "Real estate agency name",
            },
            "imagen_url": {
                "type": ["string", "null"],
                "description": "URL of the main property image",
            },
        },
        "required": [],
    },
}

SYSTEM_PROMPT = (
    "You are a real estate data extraction assistant. "
    "Extract property details from the provided listing text and call the extract_piso tool. "
    "Be precise: only extract data explicitly stated in the text."
)


class LlmScraper:
    def __init__(self, fetcher: UrlFetcherPort, anthropic_api_key: str) -> None:
        self._fetcher = fetcher
        self._anthropic = AsyncAnthropic(api_key=anthropic_api_key)

    async def scrape_piso(self, url: str) -> dict[str, Any]:
        logger.info("[scraper] Starting scrape for URL: %s", url)
        content = await self._fetcher.fetch_content(url)
        logger.info("[scraper] Fetcher returned %d chars", len(content))
        logger.info("[scraper] Full content:\n%s", content)

        if len(content) < MIN_CONTENT_CHARS:
            logger.warning(
                "[scraper] Insufficient content (%d chars < %d). Possible bot block or empty page.",
                len(content),
                MIN_CONTENT_CHARS,
            )
            raise ScrapingError(
                f"No se ha podido obtener información de la URL ({len(content)} chars). "
                "El portal puede estar bloqueando el acceso automático."
            )

        extracted = await self._extract_fields(content)
        result = {"url": url, "estado": "candidato", **extracted}
        non_null = {k: v for k, v in result.items() if v is not None}
        logger.info("[scraper] Scrape complete. Extracted fields: %s", list(non_null.keys()))
        return result

    async def scrape_piso_stream(self, url: str) -> AsyncGenerator[SseEvent, None]:
        logger.info("[scraper] Starting stream scrape for URL: %s", url)

        yield ProgressEvent(step="fetching", message="Obteniendo página del portal...")
        try:
            content = await self._fetcher.fetch_content(url)
        except ScrapingError as exc:
            yield ErrorEvent(step="fetching", message=str(exc))
            return

        logger.info("[scraper] Fetcher returned %d chars", len(content))
        if len(content) < MIN_CONTENT_CHARS:
            logger.warning(
                "[scraper] Insufficient content (%d chars < %d). Possible bot block or empty page.",
                len(content),
                MIN_CONTENT_CHARS,
            )
            yield ErrorEvent(
                step="fetching",
                message=(
                    f"No se ha podido obtener información de la página ({len(content)} chars). "
                    "El portal puede estar bloqueando el acceso automático."
                ),
            )
            return

        yield ProgressEvent(step="extracting", message="Analizando datos con IA...")
        try:
            extracted = await self._extract_fields(content)
        except ScrapingError as exc:
            yield ErrorEvent(step="extracting", message=str(exc))
            return

        result = {"url": url, "estado": "candidato", **extracted}
        non_null = {k: v for k, v in result.items() if v is not None}
        logger.info("[scraper] Extraction complete. Fields: %s", list(non_null.keys()))
        yield DoneEvent(piso=result)

    async def _extract_fields(self, content: str) -> dict[str, Any]:
        input_text = content[:8000]
        logger.info("[scraper] Sending %d chars to Claude Haiku for extraction", len(input_text))
        try:
            response = await self._anthropic.messages.create(
                model="claude-haiku-4-5",
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": input_text}],
                tools=[EXTRACT_TOOL],
                tool_choice={"type": "any"},
            )
        except anthropic.APITimeoutError as exc:
            logger.error("[scraper] Claude API timeout: %s", exc)
            raise ExtractionError("Timeout al conectar con la IA para extraer datos.") from exc
        except anthropic.APIStatusError as exc:
            logger.error("[scraper] Claude API status error %d: %s", exc.status_code, exc)
            raise ExtractionError(
                f"Error de la API de IA (HTTP {exc.status_code}) al extraer datos."
            ) from exc
        except anthropic.APIConnectionError as exc:
            logger.error("[scraper] Claude API connection error: %s", exc)
            raise ExtractionError("Error de conexión con la IA al extraer datos.") from exc

        logger.info(
            "[scraper] Claude response: stop_reason=%s, %d content blocks",
            response.stop_reason,
            len(response.content),
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "extract_piso":
                logger.info(
                    "[scraper] Claude tool_use output:\n%s",
                    json.dumps(block.input, ensure_ascii=False, indent=2),
                )
                return dict(block.input)

        logger.warning(
            "[scraper] No tool_use block found in Claude response. Content: %s", response.content
        )
        return {}
