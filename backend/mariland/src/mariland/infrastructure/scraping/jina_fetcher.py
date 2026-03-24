import logging

import httpx

from mariland.domain.exceptions import FetchError

logger = logging.getLogger(__name__)


class JinaFetcher:
    def __init__(self, api_key: str = "") -> None:
        self._api_key = api_key

    async def fetch_content(self, url: str) -> str:
        jina_url = f"https://r.jina.ai/{url}"
        headers: dict[str, str] = {
            "Accept": "text/markdown",
            "X-Timeout": "30",
        }
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        logger.info("[fetcher:jina] Fetching: %s", jina_url)
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(jina_url, headers=headers)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            logger.error("[fetcher:jina] Timeout fetching %s: %s", url, exc)
            raise FetchError(
                f"Timeout al obtener la página ({url}). El portal tardó demasiado en responder."
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "[fetcher:jina] HTTP %d fetching %s: %s", exc.response.status_code, url, exc
            )
            raise FetchError(
                f"Error HTTP {exc.response.status_code} al obtener la página ({url}). "
                "El portal puede estar bloqueando el acceso automático."
            ) from exc
        except httpx.HTTPError as exc:
            logger.error("[fetcher:jina] HTTP error fetching %s: %s", url, exc)
            raise FetchError(f"Error de red al obtener la página ({url}): {exc}") from exc

        content = response.text
        logger.info(
            "[fetcher:jina] Response: %d chars, status %d", len(content), response.status_code
        )
        return content
