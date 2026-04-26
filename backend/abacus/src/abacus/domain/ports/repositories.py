import uuid
from typing import Any, Protocol

from abacus.domain.models.asset import Asset
from abacus.domain.models.transaction import Transaction


class AssetRepository(Protocol):
    async def get_by_id(self, asset_id: uuid.UUID, user_id: uuid.UUID) -> Asset | None: ...

    async def get_by_ticker(self, ticker: str, user_id: uuid.UUID) -> Asset | None: ...

    async def list_by_user(self, user_id: uuid.UUID) -> list[Asset]: ...

    async def create(self, data: dict[str, Any]) -> Asset: ...


class TransactionRepository(Protocol):
    async def list_by_user(
        self, user_id: uuid.UUID, limit: int, offset: int
    ) -> list[Transaction]: ...

    async def create(self, data: dict[str, Any]) -> Transaction: ...

    async def count_by_user(self, user_id: uuid.UUID) -> int: ...
