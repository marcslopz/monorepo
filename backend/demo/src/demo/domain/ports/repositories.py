from typing import Protocol
from uuid import UUID

from demo.domain.models.item import Item


class ItemRepository(Protocol):
    async def get_by_id(self, item_id: UUID) -> Item | None: ...

    async def list_all(self, limit: int = 100, offset: int = 0) -> list[Item]: ...

    async def create(self, name: str, description: str | None) -> Item: ...

    async def update(
        self, item_id: UUID, name: str | None, description: str | None
    ) -> Item | None: ...

    async def delete(self, item_id: UUID) -> bool: ...
