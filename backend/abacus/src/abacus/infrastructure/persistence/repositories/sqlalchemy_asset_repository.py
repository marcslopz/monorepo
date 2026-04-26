import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from abacus.domain.models.asset import Asset
from abacus.infrastructure.persistence.models import AssetModel


class SQLAlchemyAssetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, asset_id: uuid.UUID, user_id: uuid.UUID) -> Asset | None:
        result = await self._session.execute(
            select(AssetModel).where(
                AssetModel.id == asset_id,
                AssetModel.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        return Asset.model_validate(row) if row else None

    async def get_by_ticker(self, ticker: str, user_id: uuid.UUID) -> Asset | None:
        result = await self._session.execute(
            select(AssetModel).where(
                AssetModel.ticker == ticker,
                AssetModel.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        return Asset.model_validate(row) if row else None

    async def list_by_user(self, user_id: uuid.UUID) -> list[Asset]:
        result = await self._session.execute(
            select(AssetModel).where(AssetModel.user_id == user_id).order_by(AssetModel.name)
        )
        return [Asset.model_validate(row) for row in result.scalars().all()]

    async def create(self, data: dict[str, Any]) -> Asset:
        row = AssetModel(**data)
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return Asset.model_validate(row)
