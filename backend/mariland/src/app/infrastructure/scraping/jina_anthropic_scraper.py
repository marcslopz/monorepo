from typing import Any

import httpx
from anthropic import AsyncAnthropic
from anthropic.types import ToolParam

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


class JinaAnthropicScraper:
    def __init__(self, anthropic_api_key: str) -> None:
        self._anthropic = AsyncAnthropic(api_key=anthropic_api_key)

    async def scrape_piso(self, url: str) -> dict[str, Any]:
        markdown = await self._fetch_markdown(url)
        extracted = await self._extract_fields(markdown)
        return {"url": url, "estado": "candidato", **extracted}

    async def _fetch_markdown(self, url: str) -> str:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://r.jina.ai/{url}",
                headers={"Accept": "text/markdown"},
            )
            response.raise_for_status()
            return response.text

    async def _extract_fields(self, markdown: str) -> dict[str, Any]:
        response = await self._anthropic.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": markdown[:8000]}],
            tools=[EXTRACT_TOOL],
            tool_choice={"type": "any"},
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "extract_piso":
                return dict(block.input)

        return {}
