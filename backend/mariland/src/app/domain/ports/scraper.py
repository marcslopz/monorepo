from typing import Any, Protocol


class UrlScraperPort(Protocol):
    async def scrape_piso(self, url: str) -> dict[str, Any]: ...
