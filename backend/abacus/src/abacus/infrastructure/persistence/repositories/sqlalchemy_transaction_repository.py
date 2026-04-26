import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from abacus.domain.models.transaction import Transaction, TransactionType
from abacus.domain.models.transaction_link import TransactionLink
from abacus.infrastructure.persistence.models import TransactionLinkModel, TransactionModel


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

    async def get_by_id(self, transaction_id: uuid.UUID, user_id: uuid.UUID) -> Transaction | None:
        result = await self._session.execute(
            select(TransactionModel).where(
                TransactionModel.id == transaction_id,
                TransactionModel.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        return Transaction.model_validate(row) if row else None

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

    async def list_open_buys(
        self, user_id: uuid.UUID, asset_id: uuid.UUID, currency: str
    ) -> list[tuple[Transaction, Decimal]]:
        linked_qty = func.coalesce(func.sum(TransactionLinkModel.quantity), Decimal("0")).label(
            "linked_qty"
        )
        stmt = (
            select(TransactionModel, linked_qty)
            .outerjoin(
                TransactionLinkModel,
                TransactionLinkModel.buy_id == TransactionModel.id,
            )
            .where(
                TransactionModel.user_id == user_id,
                TransactionModel.asset_id == asset_id,
                TransactionModel.currency == currency,
                TransactionModel.type == TransactionType.BUY,
            )
            .group_by(TransactionModel.id)
            .having(TransactionModel.quantity - linked_qty > 0)
            .order_by(TransactionModel.date.asc(), TransactionModel.created_at.asc())
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            (
                Transaction.model_validate(row.TransactionModel),
                row.TransactionModel.quantity - row.linked_qty,
            )
            for row in rows
        ]

    async def get_links_by_sell(self, sell_id: uuid.UUID) -> list[TransactionLink]:
        result = await self._session.execute(
            select(TransactionLinkModel).where(TransactionLinkModel.sell_id == sell_id)
        )
        return [TransactionLink.model_validate(row) for row in result.scalars().all()]

    async def get_links_by_user(self, user_id: uuid.UUID) -> list[TransactionLink]:
        result = await self._session.execute(
            select(TransactionLinkModel)
            .join(TransactionModel, TransactionModel.id == TransactionLinkModel.sell_id)
            .where(TransactionModel.user_id == user_id)
        )
        return [TransactionLink.model_validate(row) for row in result.scalars().all()]

    async def get_links_for_sells(self, sell_ids: list[uuid.UUID]) -> list[TransactionLink]:
        if not sell_ids:
            return []
        result = await self._session.execute(
            select(TransactionLinkModel).where(TransactionLinkModel.sell_id.in_(sell_ids))
        )
        return [TransactionLink.model_validate(row) for row in result.scalars().all()]

    async def list_by_ids(self, ids: list[uuid.UUID], user_id: uuid.UUID) -> list[Transaction]:
        if not ids:
            return []
        result = await self._session.execute(
            select(TransactionModel).where(
                TransactionModel.id.in_(ids),
                TransactionModel.user_id == user_id,
            )
        )
        return [Transaction.model_validate(row) for row in result.scalars().all()]
