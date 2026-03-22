import logging

import httpx

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
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(jina_url, headers=headers)
            response.raise_for_status()

        content = response.text
        logger.info(
            "[fetcher:jina] Response: %d chars, status %d", len(content), response.status_code
        )
        return content
