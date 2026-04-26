import uuid
from typing import Any

from abacus.domain.exceptions import NotFoundError
from abacus.domain.models.transaction import Transaction
from abacus.domain.ports.repositories import AssetRepository, TransactionRepository


class TransactionService:
    def __init__(
        self,
        asset_repository: AssetRepository,
        transaction_repository: TransactionRepository,
    ) -> None:
        self._asset_repo = asset_repository
        self._tx_repo = transaction_repository

    async def list_transactions(
        self, user_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[Transaction], int]:
        transactions = await self._tx_repo.list_by_user(user_id, limit, offset)
        total = await self._tx_repo.count_by_user(user_id)
        return transactions, total

    async def create_transaction(self, user_id: uuid.UUID, data: dict[str, Any]) -> Transaction:
        asset = await self._asset_repo.get_by_id(data["asset_id"], user_id)
        if asset is None:
            raise NotFoundError("Asset", str(data["asset_id"]))
        data["user_id"] = user_id
        if not data.get("currency"):
            data["currency"] = asset.currency
        return await self._tx_repo.create(data)
