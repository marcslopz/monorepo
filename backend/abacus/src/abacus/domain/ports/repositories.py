import uuid
from decimal import Decimal
from typing import Any, Protocol

from abacus.domain.models.asset import Asset
from abacus.domain.models.transaction import Transaction
from abacus.domain.models.transaction_link import TransactionLink


class AssetRepository(Protocol):
    async def get_by_id(self, asset_id: uuid.UUID, user_id: uuid.UUID) -> Asset | None: ...

    async def get_by_ticker(self, ticker: str, user_id: uuid.UUID) -> Asset | None: ...

    async def list_by_user(self, user_id: uuid.UUID) -> list[Asset]: ...

    async def create(self, data: dict[str, Any]) -> Asset: ...


class TransactionRepository(Protocol):
    async def list_by_user(
        self, user_id: uuid.UUID, limit: int, offset: int
    ) -> list[Transaction]: ...

    async def get_by_id(
        self, transaction_id: uuid.UUID, user_id: uuid.UUID
    ) -> Transaction | None: ...

    async def create(self, data: dict[str, Any]) -> Transaction: ...

    async def count_by_user(self, user_id: uuid.UUID) -> int: ...

    async def list_open_buys(
        self, user_id: uuid.UUID, asset_id: uuid.UUID, currency: str
    ) -> list[tuple[Transaction, Decimal]]: ...

    async def get_links_by_sell(self, sell_id: uuid.UUID) -> list[TransactionLink]: ...

    async def get_links_by_user(self, user_id: uuid.UUID) -> list[TransactionLink]: ...

    async def get_links_for_sells(self, sell_ids: list[uuid.UUID]) -> list[TransactionLink]: ...

    async def list_by_ids(self, ids: list[uuid.UUID], user_id: uuid.UUID) -> list[Transaction]: ...


class TransactionLinkRepository(Protocol):
    async def replace_links_for_sell(
        self, sell_id: uuid.UUID, links: list[tuple[uuid.UUID, Decimal]]
    ) -> list[TransactionLink]: ...

    async def get_allocated_for_buy_excluding_sell(
        self, buy_id: uuid.UUID, sell_id: uuid.UUID
    ) -> Decimal: ...
