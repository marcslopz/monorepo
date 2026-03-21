from unittest.mock import AsyncMock

import pytest

from app.application.services.piso_service import PisoService
from app.domain.exceptions import NotFoundError
from tests.conftest import make_piso


@pytest.fixture
def service(mock_piso_repository: AsyncMock) -> PisoService:
    return PisoService(repository=mock_piso_repository)


@pytest.mark.asyncio
async def test_list_pisos(service: PisoService, mock_piso_repository: AsyncMock) -> None:
    pisos = [make_piso(id=i, direccion=f"Calle {i}") for i in range(3)]
    mock_piso_repository.list_all.return_value = pisos

    result = await service.list_pisos()

    assert len(result) == 3
    mock_piso_repository.list_all.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_piso_returns_piso(service: PisoService, mock_piso_repository: AsyncMock) -> None:
    piso = make_piso(id=42, direccion="Gran Via 1")
    mock_piso_repository.get_by_id.return_value = piso

    result = await service.get_piso(42)

    assert result.id == 42
    assert result.direccion == "Gran Via 1"
    mock_piso_repository.get_by_id.assert_awaited_once_with(42)


@pytest.mark.asyncio
async def test_get_piso_raises_not_found(
    service: PisoService, mock_piso_repository: AsyncMock
) -> None:
    mock_piso_repository.get_by_id.return_value = None

    with pytest.raises(NotFoundError) as exc_info:
        await service.get_piso(999)

    assert "Piso" in str(exc_info.value)


@pytest.mark.asyncio
async def test_create_piso(service: PisoService, mock_piso_repository: AsyncMock) -> None:
    piso = make_piso(direccion="Nueva Calle 5", precio=300000)
    mock_piso_repository.create.return_value = piso

    data = {"direccion": "Nueva Calle 5", "precio": 300000, "estado": "candidato"}
    result = await service.create_piso(data)

    assert result.direccion == "Nueva Calle 5"
    mock_piso_repository.create.assert_awaited_once_with(data)


@pytest.mark.asyncio
async def test_update_piso(service: PisoService, mock_piso_repository: AsyncMock) -> None:
    piso = make_piso(estado="visitado")
    mock_piso_repository.update.return_value = piso

    result = await service.update_piso(1, {"estado": "visitado"})

    assert result.estado == "visitado"
    mock_piso_repository.update.assert_awaited_once_with(1, {"estado": "visitado"})


@pytest.mark.asyncio
async def test_update_piso_raises_not_found(
    service: PisoService, mock_piso_repository: AsyncMock
) -> None:
    mock_piso_repository.update.return_value = None

    with pytest.raises(NotFoundError):
        await service.update_piso(999, {"estado": "visitado"})


@pytest.mark.asyncio
async def test_delete_piso(service: PisoService, mock_piso_repository: AsyncMock) -> None:
    mock_piso_repository.delete.return_value = True

    await service.delete_piso(1)

    mock_piso_repository.delete.assert_awaited_once_with(1)


@pytest.mark.asyncio
async def test_delete_piso_raises_not_found(
    service: PisoService, mock_piso_repository: AsyncMock
) -> None:
    mock_piso_repository.delete.return_value = False

    with pytest.raises(NotFoundError):
        await service.delete_piso(999)


@pytest.mark.asyncio
async def test_create_piso_with_imagen_url(
    service: PisoService, mock_piso_repository: AsyncMock
) -> None:
    piso = make_piso(imagen_url="https://example.com/foto.jpg")
    mock_piso_repository.create.return_value = piso

    data = {
        "direccion": "Calle Falsa 123",
        "estado": "candidato",
        "imagen_url": "https://example.com/foto.jpg",
    }
    result = await service.create_piso(data)

    assert result.imagen_url == "https://example.com/foto.jpg"
    mock_piso_repository.create.assert_awaited_once_with(data)


@pytest.mark.asyncio
async def test_update_piso_imagen_url(
    service: PisoService, mock_piso_repository: AsyncMock
) -> None:
    piso = make_piso(imagen_url="https://nueva.com/img.jpg")
    mock_piso_repository.update.return_value = piso

    result = await service.update_piso(1, {"imagen_url": "https://nueva.com/img.jpg"})

    assert result.imagen_url == "https://nueva.com/img.jpg"
    mock_piso_repository.update.assert_awaited_once_with(
        1, {"imagen_url": "https://nueva.com/img.jpg"}
    )
