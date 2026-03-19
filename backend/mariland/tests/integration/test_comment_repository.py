import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.repositories.sqlalchemy_comment_repository import (
    SQLAlchemyCommentRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_piso_repository import (
    SQLAlchemyPisoRepository,
)


@pytest.mark.asyncio
async def test_add_and_delete_comment(db_session: AsyncSession) -> None:
    piso_repo = SQLAlchemyPisoRepository(db_session)
    comment_repo = SQLAlchemyCommentRepository(db_session)

    piso = await piso_repo.create({"direccion": "Test Comment Street", "estado": "candidato"})
    comment = await comment_repo.add(piso.id, "Muy luminoso")

    assert comment.id is not None
    assert comment.texto == "Muy luminoso"
    assert comment.piso_id == piso.id

    deleted = await comment_repo.delete(piso.id, comment.id)
    assert deleted is True


@pytest.mark.asyncio
async def test_delete_nonexistent_comment(db_session: AsyncSession) -> None:
    comment_repo = SQLAlchemyCommentRepository(db_session)
    deleted = await comment_repo.delete(1, 99999)
    assert deleted is False
