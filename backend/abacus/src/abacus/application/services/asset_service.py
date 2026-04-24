import uuid
from typing import Any

from abacus.domain.models.asset import Asset
from abacus.domain.ports.repositories import AssetRepository


class AssetService:
    def __init__(self, repository: AssetRepository) -> None:
        self._repository = repository

    async def list_assets(self, user_id: uuid.UUID) -> list[Asset]:
        return await self._repository.list_by_user(user_id)

    async def create_asset(self, user_id: uuid.UUID, data: dict[str, Any]) -> Asset:
        data["user_id"] = user_id
        return await self._repository.create(data)
