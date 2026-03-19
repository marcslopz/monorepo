from collections.abc import AsyncGenerator
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.item_service import ItemService
from app.config import settings
from app.infrastructure.cache.redis_cache import RedisCacheService
from app.infrastructure.persistence.database import get_session
from app.infrastructure.persistence.repositories.sqlalchemy_item_repository import (
    SQLAlchemyItemRepository,
)


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:  # type: ignore[type-arg]
    client: aioredis.Redis = aioredis.from_url(settings.redis_url, decode_responses=True)  # type: ignore[type-arg]
    try:
        yield client
    finally:
        await client.aclose()


SessionDep = Annotated[AsyncSession, Depends(get_session)]
RedisDep = Annotated[aioredis.Redis, Depends(get_redis)]  # type: ignore[type-arg]


def get_item_service(session: SessionDep, redis: RedisDep) -> ItemService:
    repository = SQLAlchemyItemRepository(session)
    cache = RedisCacheService(redis)
    return ItemService(repository=repository, cache=cache)


ItemServiceDep = Annotated[ItemService, Depends(get_item_service)]
