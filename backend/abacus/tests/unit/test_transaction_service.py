import uuid
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from abacus.application.services.transaction_service import TransactionService
from abacus.domain.exceptions import NotFoundError
from abacus.domain.models.transaction import TransactionType
from tests.conftest import TEST_ASSET_ID, TEST_USER_ID, make_asset, make_transaction


@pytest.fixture
def service(
    mock_asset_repository: AsyncMock, mock_transaction_repository: AsyncMock
) -> TransactionService:
    return TransactionService(
        asset_repository=mock_asset_repository,
        transaction_repository=mock_transaction_repository,
    )


async def test_create_transaction_injects_user_id(
    service: TransactionService,
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
) -> None:
    asset = make_asset()
    tx = make_transaction()
    mock_asset_repository.get_by_id.return_value = asset
    mock_transaction_repository.create.return_value = tx

    data = {
        "asset_id": TEST_ASSET_ID,
        "date": tx.date,
        "type": TransactionType.BUY,
        "quantity": Decimal("10"),
        "price_per_unit": Decimal("150"),
        "fee": Decimal("0"),
        "broker": None,
        "notes": None,
    }
    result = await service.create_transaction(TEST_USER_ID, data)

    assert result == tx
    call_data = mock_transaction_repository.create.call_args[0][0]
    assert call_data["user_id"] == TEST_USER_ID


async def test_create_transaction_raises_if_asset_not_found(
    service: TransactionService,
    mock_asset_repository: AsyncMock,
) -> None:
    mock_asset_repository.get_by_id.return_value = None

    with pytest.raises(NotFoundError):
        await service.create_transaction(
            TEST_USER_ID,
            {"asset_id": uuid.uuid4(), "quantity": Decimal("1"), "price_per_unit": Decimal("10")},
        )


async def test_list_transactions_returns_paginated(
    service: TransactionService,
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
) -> None:
    txs = [make_transaction(), make_transaction()]
    mock_transaction_repository.list_by_user.return_value = txs
    mock_transaction_repository.count_by_user.return_value = 2

    items, total = await service.list_transactions(TEST_USER_ID, limit=10, offset=0)

    assert items == txs
    assert total == 2
