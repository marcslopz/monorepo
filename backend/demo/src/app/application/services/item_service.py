from uuid import UUID

from app.domain.exceptions import NotFoundError
from app.domain.models.item import Item
from app.domain.ports.cache import CacheService
from app.domain.ports.repositories import ItemRepository

ITEM_CACHE_TTL = 300
ITEM_CACHE_PREFIX = "item:"


class ItemService:
    def __init__(self, repository: ItemRepository, cache: CacheService) -> None:
        self._repository = repository
        self._cache = cache

    async def get_item(self, item_id: UUID) -> Item:
        cache_key = f"{ITEM_CACHE_PREFIX}{item_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return Item.model_validate(cached)

        item = await self._repository.get_by_id(item_id)
        if item is None:
            raise NotFoundError("Item", str(item_id))

        await self._cache.set(cache_key, item.model_dump(mode="json"), ttl_seconds=ITEM_CACHE_TTL)
        return item

    async def list_items(self, limit: int = 100, offset: int = 0) -> list[Item]:
        return await self._repository.list_all(limit=limit, offset=offset)

    async def create_item(self, name: str, description: str | None = None) -> Item:
        item = await self._repository.create(name=name, description=description)
        cache_key = f"{ITEM_CACHE_PREFIX}{item.id}"
        await self._cache.set(cache_key, item.model_dump(mode="json"), ttl_seconds=ITEM_CACHE_TTL)
        return item

    async def update_item(
        self, item_id: UUID, name: str | None = None, description: str | None = None
    ) -> Item:
        item = await self._repository.update(item_id, name=name, description=description)
        if item is None:
            raise NotFoundError("Item", str(item_id))

        cache_key = f"{ITEM_CACHE_PREFIX}{item_id}"
        await self._cache.delete(cache_key)
        return item

    async def delete_item(self, item_id: UUID) -> None:
        deleted = await self._repository.delete(item_id)
        if not deleted:
            raise NotFoundError("Item", str(item_id))

        cache_key = f"{ITEM_CACHE_PREFIX}{item_id}"
        await self._cache.delete(cache_key)
