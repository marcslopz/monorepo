import uuid
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from abacus.domain.models.transaction_link import TransactionLink
from abacus.infrastructure.persistence.models import TransactionLinkModel


class SQLAlchemyTransactionLinkRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def replace_links_for_sell(
        self, sell_id: uuid.UUID, links: list[tuple[uuid.UUID, Decimal]]
    ) -> list[TransactionLink]:
        await self._session.execute(
            delete(TransactionLinkModel).where(TransactionLinkModel.sell_id == sell_id)
        )
        rows = []
        for buy_id, quantity in links:
            row = TransactionLinkModel(
                id=uuid.uuid4(), sell_id=sell_id, buy_id=buy_id, quantity=quantity
            )
            self._session.add(row)
            rows.append(row)
        await self._session.flush()
        for row in rows:
            await self._session.refresh(row)
        return [TransactionLink.model_validate(row) for row in rows]

    async def get_allocated_for_buy_excluding_sell(
        self, buy_id: uuid.UUID, sell_id: uuid.UUID
    ) -> Decimal:
        result = await self._session.execute(
            select(func.coalesce(func.sum(TransactionLinkModel.quantity), Decimal("0"))).where(
                TransactionLinkModel.buy_id == buy_id,
                TransactionLinkModel.sell_id != sell_id,
            )
        )
        return result.scalar_one()
