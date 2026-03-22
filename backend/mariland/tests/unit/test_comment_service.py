from unittest.mock import AsyncMock

import pytest

from mariland.application.services.comment_service import CommentService
from mariland.domain.exceptions import NotFoundError
from tests.conftest import make_comment, make_piso


@pytest.fixture
def service(mock_piso_repository: AsyncMock, mock_comment_repository: AsyncMock) -> CommentService:
    return CommentService(
        piso_repository=mock_piso_repository,
        comment_repository=mock_comment_repository,
    )


@pytest.mark.asyncio
async def test_add_comment(
    service: CommentService,
    mock_piso_repository: AsyncMock,
    mock_comment_repository: AsyncMock,
) -> None:
    piso = make_piso(id=1)
    comment = make_comment(piso_id=1, texto="Muy bien ubicado")
    mock_piso_repository.get_by_id.return_value = piso
    mock_comment_repository.add.return_value = comment

    result = await service.add_comment(1, "Muy bien ubicado")

    assert result.texto == "Muy bien ubicado"
    mock_piso_repository.get_by_id.assert_awaited_once_with(1)
    mock_comment_repository.add.assert_awaited_once_with(1, "Muy bien ubicado")


@pytest.mark.asyncio
async def test_add_comment_raises_not_found_when_piso_missing(
    service: CommentService,
    mock_piso_repository: AsyncMock,
    mock_comment_repository: AsyncMock,
) -> None:
    mock_piso_repository.get_by_id.return_value = None

    with pytest.raises(NotFoundError) as exc_info:
        await service.add_comment(999, "Comentario")

    assert "Piso" in str(exc_info.value)
    mock_comment_repository.add.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_comment(
    service: CommentService,
    mock_piso_repository: AsyncMock,
    mock_comment_repository: AsyncMock,
) -> None:
    mock_comment_repository.delete.return_value = True

    await service.delete_comment(1, 10)

    mock_comment_repository.delete.assert_awaited_once_with(1, 10)


@pytest.mark.asyncio
async def test_delete_comment_raises_not_found(
    service: CommentService,
    mock_piso_repository: AsyncMock,
    mock_comment_repository: AsyncMock,
) -> None:
    mock_comment_repository.delete.return_value = False

    with pytest.raises(NotFoundError):
        await service.delete_comment(1, 999)
