import logging
import re

import httpx

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
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(self._BASE_URL, params=params)
            response.raise_for_status()

        content = _html_to_text(response.text)
        logger.info(
            "[fetcher:scrapingbee] Response: %d chars, status %d",
            len(content),
            response.status_code,
        )
        return content
