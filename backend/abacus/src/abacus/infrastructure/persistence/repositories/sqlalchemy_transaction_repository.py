import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from abacus.domain.models.transaction import Transaction
from abacus.infrastructure.persistence.models import TransactionModel


class SQLAlchemyTransactionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_user(self, user_id: uuid.UUID, limit: int, offset: int) -> list[Transaction]:
        result = await self._session.execute(
            select(TransactionModel)
            .where(TransactionModel.user_id == user_id)
            .order_by(TransactionModel.date.desc(), TransactionModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [Transaction.model_validate(row) for row in result.scalars().all()]

    async def create(self, data: dict[str, Any]) -> Transaction:
        row = TransactionModel(**data)
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return Transaction.model_validate(row)

    async def count_by_user(self, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count()).where(TransactionModel.user_id == user_id)
        )
        return result.scalar_one()
