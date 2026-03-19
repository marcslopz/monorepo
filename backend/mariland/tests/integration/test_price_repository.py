import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.repositories.sqlalchemy_piso_repository import (
    SQLAlchemyPisoRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_price_repository import (
    SQLAlchemyPriceHistoryRepository,
)


@pytest.mark.asyncio
async def test_add_and_delete_price(db_session: AsyncSession) -> None:
    piso_repo = SQLAlchemyPisoRepository(db_session)
    price_repo = SQLAlchemyPriceHistoryRepository(db_session)

    piso = await piso_repo.create({"direccion": "Test Price Street", "estado": "candidato"})
    price = await price_repo.add(piso.id, 250000, "Precio inicial")

    assert price.id is not None
    assert price.precio == 250000
    assert price.piso_id == piso.id
    assert price.notas == "Precio inicial"

    deleted = await price_repo.delete(piso.id, price.id)
    assert deleted is True


@pytest.mark.asyncio
async def test_delete_nonexistent_price(db_session: AsyncSession) -> None:
    price_repo = SQLAlchemyPriceHistoryRepository(db_session)
    deleted = await price_repo.delete(1, 99999)
    assert deleted is False
