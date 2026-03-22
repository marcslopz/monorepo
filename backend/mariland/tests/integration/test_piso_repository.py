import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from mariland.infrastructure.persistence.repositories.sqlalchemy_piso_repository import (
    SQLAlchemyPisoRepository,
)


@pytest.mark.asyncio
async def test_create_and_get_piso(db_session: AsyncSession) -> None:
    repo = SQLAlchemyPisoRepository(db_session)

    piso = await repo.create({"direccion": "Calle Real 1", "precio": 200000, "estado": "candidato"})

    assert piso.id is not None
    assert piso.direccion == "Calle Real 1"
    assert piso.precio == 200000

    fetched = await repo.get_by_id(piso.id)
    assert fetched is not None
    assert fetched.id == piso.id


@pytest.mark.asyncio
async def test_list_pisos(db_session: AsyncSession) -> None:
    repo = SQLAlchemyPisoRepository(db_session)

    for i in range(3):
        await repo.create({"direccion": f"Calle {i}", "estado": "candidato"})

    pisos = await repo.list_all()
    assert len(pisos) >= 3


@pytest.mark.asyncio
async def test_update_piso(db_session: AsyncSession) -> None:
    repo = SQLAlchemyPisoRepository(db_session)

    piso = await repo.create({"direccion": "Original", "estado": "candidato"})
    updated = await repo.update(piso.id, {"estado": "visitado", "precio": 180000})

    assert updated is not None
    assert updated.estado == "visitado"
    assert updated.precio == 180000


@pytest.mark.asyncio
async def test_delete_piso(db_session: AsyncSession) -> None:
    repo = SQLAlchemyPisoRepository(db_session)

    piso = await repo.create({"direccion": "A Borrar", "estado": "candidato"})
    deleted = await repo.delete(piso.id)
    assert deleted is True

    fetched = await repo.get_by_id(piso.id)
    assert fetched is None


@pytest.mark.asyncio
async def test_get_nonexistent_piso(db_session: AsyncSession) -> None:
    repo = SQLAlchemyPisoRepository(db_session)
    fetched = await repo.get_by_id(99999)
    assert fetched is None


@pytest.mark.asyncio
async def test_create_piso_with_imagen_url(db_session: AsyncSession) -> None:
    repo = SQLAlchemyPisoRepository(db_session)

    piso = await repo.create({"estado": "candidato", "imagen_url": "https://foto.com/1.jpg"})

    assert piso.imagen_url == "https://foto.com/1.jpg"

    fetched = await repo.get_by_id(piso.id)
    assert fetched is not None
    assert fetched.imagen_url == "https://foto.com/1.jpg"


@pytest.mark.asyncio
async def test_update_piso_imagen_url(db_session: AsyncSession) -> None:
    repo = SQLAlchemyPisoRepository(db_session)

    piso = await repo.create({"estado": "candidato"})
    updated = await repo.update(piso.id, {"imagen_url": "https://nueva.com/img.jpg"})

    assert updated is not None
    assert updated.imagen_url == "https://nueva.com/img.jpg"
