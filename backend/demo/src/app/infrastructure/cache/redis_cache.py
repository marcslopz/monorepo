import json
from typing import Any

import redis.asyncio as aioredis


class RedisCacheService:
    def __init__(self, redis_client: aioredis.Redis) -> None:  # type: ignore[type-arg]
        self._redis = redis_client

    async def get(self, key: str) -> Any | None:
        value = await self._redis.get(key)
        if value is None:
            return None
        return json.loads(value)

    async def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        serialized = json.dumps(value, default=str)
        await self._redis.setex(key, ttl_seconds, serialized)

    async def delete(self, key: str) -> None:
        await self._redis.delete(key)

    async def exists(self, key: str) -> bool:
        result: int = await self._redis.exists(key)
        return result > 0
