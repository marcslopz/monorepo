import logging
import re

import httpx

from mariland.domain.exceptions import FetchError

logger = logging.getLogger(__name__)


def _html_to_text(html: str) -> str:
    """Strip script/style blocks and HTML tags, collapse whitespace."""
    html = re.sub(
        r"<(script|style)[^>]*>.*?</(script|style)>", "", html, flags=re.DOTALL | re.IGNORECASE
    )
    html = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", html).strip()


class ScrapingBeeFetcher:
    _BASE_URL = "https://app.scrapingbee.com/api/v1/"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def fetch_content(self, url: str) -> str:
        params = {
            "api_key": self._api_key,
            "url": url,
            "render_js": "true",
            "premium_proxy": "true",
            "block_resources": "true",
            "wait": "3000",
        }

        logger.info("[fetcher:scrapingbee] Fetching: %s", url)
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.get(self._BASE_URL, params=params)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            logger.error("[fetcher:scrapingbee] Timeout fetching %s: %s", url, exc)
            raise FetchError(
                f"Timeout al obtener la página ({url}). El portal tardó demasiado en responder."
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "[fetcher:scrapingbee] HTTP %d fetching %s: %s",
                exc.response.status_code,
                url,
                exc,
            )
            raise FetchError(
                f"Error HTTP {exc.response.status_code} al obtener la página ({url}). "
                "El portal puede estar bloqueando el acceso automático."
            ) from exc
        except httpx.HTTPError as exc:
            logger.error("[fetcher:scrapingbee] HTTP error fetching %s: %s", url, exc)
            raise FetchError(f"Error de red al obtener la página ({url}): {exc}") from exc

        content = _html_to_text(response.text)
        logger.info(
            "[fetcher:scrapingbee] Response: %d chars, status %d",
            len(content),
            response.status_code,
        )
        return content
