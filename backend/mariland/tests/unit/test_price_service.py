from unittest.mock import AsyncMock

import pytest

from mariland.application.services.price_service import PriceService
from mariland.domain.exceptions import NotFoundError
from tests.conftest import make_piso, make_price_history


@pytest.fixture
def service(mock_piso_repository: AsyncMock, mock_price_repository: AsyncMock) -> PriceService:
    return PriceService(
        piso_repository=mock_piso_repository,
        price_repository=mock_price_repository,
    )


@pytest.mark.asyncio
async def test_add_price(
    service: PriceService,
    mock_piso_repository: AsyncMock,
    mock_price_repository: AsyncMock,
) -> None:
    piso = make_piso(id=1)
    price = make_price_history(piso_id=1, precio=220000, notas="Bajada de precio")
    mock_piso_repository.get_by_id.return_value = piso
    mock_price_repository.add.return_value = price

    result = await service.add_price(1, 220000, "Bajada de precio")

    assert result.precio == 220000
    mock_piso_repository.get_by_id.assert_awaited_once_with(1)
    mock_price_repository.add.assert_awaited_once_with(1, 220000, "Bajada de precio")


@pytest.mark.asyncio
async def test_add_price_raises_not_found_when_piso_missing(
    service: PriceService,
    mock_piso_repository: AsyncMock,
    mock_price_repository: AsyncMock,
) -> None:
    mock_piso_repository.get_by_id.return_value = None

    with pytest.raises(NotFoundError) as exc_info:
        await service.add_price(999, 200000, None)

    assert "Piso" in str(exc_info.value)
    mock_price_repository.add.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_price(
    service: PriceService,
    mock_piso_repository: AsyncMock,
    mock_price_repository: AsyncMock,
) -> None:
    mock_price_repository.delete.return_value = True

    await service.delete_price(1, 10)

    mock_price_repository.delete.assert_awaited_once_with(1, 10)


@pytest.mark.asyncio
async def test_delete_price_raises_not_found(
    service: PriceService,
    mock_piso_repository: AsyncMock,
    mock_price_repository: AsyncMock,
) -> None:
    mock_price_repository.delete.return_value = False

    with pytest.raises(NotFoundError):
        await service.delete_price(1, 999)
