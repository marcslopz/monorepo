from typing import Protocol


class UrlFetcherPort(Protocol):
    async def fetch_content(self, url: str) -> str: ...
