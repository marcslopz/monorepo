from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.models.piso import Piso
from app.infrastructure.persistence.models import PisoModel


class SQLAlchemyPisoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, piso_id: int) -> Piso | None:
        result = await self._session.execute(
            select(PisoModel)
            .options(
                selectinload(PisoModel.price_history),
                selectinload(PisoModel.comments),
            )
            .where(PisoModel.id == piso_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return Piso.model_validate(row)

    async def list_all(self) -> list[Piso]:
        result = await self._session.execute(
            select(PisoModel)
            .options(
                selectinload(PisoModel.price_history),
                selectinload(PisoModel.comments),
            )
            .order_by(PisoModel.created_at.desc())
        )
        return [Piso.model_validate(row) for row in result.scalars().all()]

    async def create(self, data: dict[str, Any]) -> Piso:
        piso = PisoModel(**data)
        self._session.add(piso)
        await self._session.flush()
        await self._session.refresh(piso)
        result = await self._session.execute(
            select(PisoModel)
            .options(
                selectinload(PisoModel.price_history),
                selectinload(PisoModel.comments),
            )
            .where(PisoModel.id == piso.id)
        )
        return Piso.model_validate(result.scalar_one())

    async def update(self, piso_id: int, data: dict[str, Any]) -> Piso | None:
        result = await self._session.execute(
            select(PisoModel).where(PisoModel.id == piso_id)
        )
        piso = result.scalar_one_or_none()
        if piso is None:
            return None
        for field, value in data.items():
            setattr(piso, field, value)
        await self._session.flush()
        result = await self._session.execute(
            select(PisoModel)
            .options(
                selectinload(PisoModel.price_history),
                selectinload(PisoModel.comments),
            )
            .where(PisoModel.id == piso_id)
        )
        return Piso.model_validate(result.scalar_one())

    async def delete(self, piso_id: int) -> bool:
        result = await self._session.execute(
            select(PisoModel).where(PisoModel.id == piso_id)
        )
        piso = result.scalar_one_or_none()
        if piso is None:
            return False
        await self._session.delete(piso)
        await self._session.flush()
        return True
