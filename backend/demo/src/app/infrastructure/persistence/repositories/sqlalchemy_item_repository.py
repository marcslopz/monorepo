from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.item import Item
from app.infrastructure.persistence.models import ItemModel


class SQLAlchemyItemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, item_id: UUID) -> Item | None:
        result = await self._session.execute(
            select(ItemModel).where(ItemModel.id == item_id)
        )
        row = result.scalar_one_or_none()
        return Item.model_validate(row) if row else None

    async def list_all(self, limit: int = 100, offset: int = 0) -> list[Item]:
        result = await self._session.execute(
            select(ItemModel).limit(limit).offset(offset).order_by(ItemModel.created_at.desc())
        )
        rows = result.scalars().all()
        return [Item.model_validate(row) for row in rows]

    async def create(self, name: str, description: str | None) -> Item:
        row = ItemModel(name=name, description=description)
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return Item.model_validate(row)

    async def update(self, item_id: UUID, name: str | None, description: str | None) -> Item | None:
        result = await self._session.execute(
            select(ItemModel).where(ItemModel.id == item_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None

        if name is not None:
            row.name = name
        if description is not None:
            row.description = description

        await self._session.flush()
        await self._session.refresh(row)
        return Item.model_validate(row)

    async def delete(self, item_id: UUID) -> bool:
        result = await self._session.execute(
            select(ItemModel).where(ItemModel.id == item_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.flush()
        return True
