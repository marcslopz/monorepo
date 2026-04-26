import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from abacus.application.services.transaction_service import TransactionService
from abacus.domain.exceptions import LinkValidationError, NotFoundError
from abacus.domain.models.transaction import TransactionType
from abacus.domain.models.transaction_link import TransactionLink
from tests.conftest import TEST_ASSET_ID, TEST_USER_ID, make_asset, make_transaction

_NOW = datetime.now(tz=UTC)


def make_link(sell_id: uuid.UUID, buy_id: uuid.UUID, quantity: str) -> TransactionLink:
    return TransactionLink(
        id=uuid.uuid4(),
        sell_id=sell_id,
        buy_id=buy_id,
        quantity=Decimal(quantity),
        created_at=_NOW,
    )


@pytest.fixture
def mock_link_repository() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def service(
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> TransactionService:
    return TransactionService(
        asset_repository=mock_asset_repository,
        transaction_repository=mock_transaction_repository,
        link_repository=mock_link_repository,
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
        "currency": "USD",
        "broker": None,
        "notes": None,
    }
    result = await service.create_transaction(TEST_USER_ID, data)

    assert result == tx
    call_data = mock_transaction_repository.create.call_args[0][0]
    assert call_data["user_id"] == TEST_USER_ID


async def test_create_transaction_defaults_currency_from_asset(
    service: TransactionService,
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
) -> None:
    asset = make_asset(currency="USD")
    tx = make_transaction(currency="USD")
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
        # no currency provided
    }
    await service.create_transaction(TEST_USER_ID, data)

    call_data = mock_transaction_repository.create.call_args[0][0]
    assert call_data["currency"] == "USD"


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


# ── FIFO auto-linking tests ───────────────────────────────────────────────────


async def test_create_sell_auto_links_fifo(
    service: TransactionService,
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    """Creating a sell with 12 units should consume 10 from buy1 then 2 from buy2 (FIFO)."""
    buy1 = make_transaction(type=TransactionType.BUY, quantity=Decimal("10"), date=date(2024, 1, 1))
    buy2 = make_transaction(type=TransactionType.BUY, quantity=Decimal("5"), date=date(2024, 2, 1))
    sell = make_transaction(type=TransactionType.SELL, quantity=Decimal("12"))
    asset = make_asset()

    mock_asset_repository.get_by_id.return_value = asset
    mock_transaction_repository.create.return_value = sell
    mock_transaction_repository.list_open_buys.return_value = [
        (buy1, Decimal("10")),
        (buy2, Decimal("5")),
    ]
    mock_link_repository.replace_links_for_sell.return_value = []

    await service.create_transaction(
        TEST_USER_ID,
        {
            "asset_id": TEST_ASSET_ID,
            "date": sell.date,
            "type": TransactionType.SELL,
            "quantity": Decimal("12"),
            "price_per_unit": Decimal("120"),
            "fee": Decimal("0"),
            "currency": "USD",
        },
    )

    mock_link_repository.replace_links_for_sell.assert_called_once()
    call_sell_id, call_links = mock_link_repository.replace_links_for_sell.call_args[0]
    assert call_sell_id == sell.id
    assert call_links == [(buy1.id, Decimal("10")), (buy2.id, Decimal("2"))]


async def test_create_sell_partial_when_insufficient_buys(
    service: TransactionService,
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    """When buys cover only part of sell qty, link partially and don't raise."""
    buy = make_transaction(type=TransactionType.BUY, quantity=Decimal("5"), date=date(2024, 1, 1))
    sell = make_transaction(type=TransactionType.SELL, quantity=Decimal("10"))
    asset = make_asset()

    mock_asset_repository.get_by_id.return_value = asset
    mock_transaction_repository.create.return_value = sell
    mock_transaction_repository.list_open_buys.return_value = [(buy, Decimal("5"))]
    mock_link_repository.replace_links_for_sell.return_value = []

    await service.create_transaction(
        TEST_USER_ID,
        {
            "asset_id": TEST_ASSET_ID,
            "date": sell.date,
            "type": TransactionType.SELL,
            "quantity": Decimal("10"),
            "price_per_unit": Decimal("120"),
            "fee": Decimal("0"),
            "currency": "USD",
        },
    )

    _, call_links = mock_link_repository.replace_links_for_sell.call_args[0]
    assert call_links == [(buy.id, Decimal("5"))]


async def test_create_buy_does_not_trigger_fifo(
    service: TransactionService,
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    """BUY transactions never call replace_links_for_sell."""
    asset = make_asset()
    tx = make_transaction(type=TransactionType.BUY)
    mock_asset_repository.get_by_id.return_value = asset
    mock_transaction_repository.create.return_value = tx

    await service.create_transaction(
        TEST_USER_ID,
        {
            "asset_id": TEST_ASSET_ID,
            "date": tx.date,
            "type": TransactionType.BUY,
            "quantity": Decimal("10"),
            "price_per_unit": Decimal("100"),
            "fee": Decimal("0"),
            "currency": "USD",
        },
    )

    mock_link_repository.replace_links_for_sell.assert_not_called()


# ── update_sell_links validation tests ───────────────────────────────────────


async def _setup_update_sell_links(
    mock_tx_repo: AsyncMock,
    mock_link_repo: AsyncMock,
    sell: object,
    buys: list,
    buy_allocations: dict | None = None,
) -> None:
    mock_tx_repo.get_by_id.side_effect = lambda tx_id, user_id: next(
        (t for t in [sell, *buys] if t.id == tx_id), None
    )
    mock_link_repo.get_allocated_for_buy_excluding_sell.return_value = Decimal("0")
    if buy_allocations:
        mock_link_repo.get_allocated_for_buy_excluding_sell.side_effect = lambda buy_id, sell_id: (
            buy_allocations.get(buy_id, Decimal("0"))
        )
    mock_link_repo.replace_links_for_sell.return_value = []


def _tx_side_effect(*txs: object) -> object:
    def _lookup(tx_id: uuid.UUID, uid: uuid.UUID) -> object:
        return next((t for t in txs if t.id == tx_id), None)  # type: ignore[attr-defined]

    return _lookup


async def test_update_sell_links_success(
    service: TransactionService,
    mock_asset_repository: AsyncMock,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    buy = make_transaction(
        type=TransactionType.BUY, quantity=Decimal("10"), date=date(2024, 1, 1), fee=Decimal("0")
    )
    sell = make_transaction(
        type=TransactionType.SELL, quantity=Decimal("5"), date=date(2024, 6, 1), fee=Decimal("0")
    )

    await _setup_update_sell_links(mock_transaction_repository, mock_link_repository, sell, [buy])

    result = await service.update_sell_links(TEST_USER_ID, sell.id, [(buy.id, Decimal("5"))])

    mock_link_repository.replace_links_for_sell.assert_called_once_with(
        sell.id, [(buy.id, Decimal("5"))]
    )
    assert result is not None


async def test_update_sell_links_raises_if_sell_not_found(
    service: TransactionService,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    mock_transaction_repository.get_by_id.return_value = None
    with pytest.raises(NotFoundError):
        await service.update_sell_links(TEST_USER_ID, uuid.uuid4(), [])


async def test_update_sell_links_raises_if_buy_not_found(
    service: TransactionService,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    sell = make_transaction(type=TransactionType.SELL, quantity=Decimal("5"), date=date(2024, 6, 1))
    mock_transaction_repository.get_by_id.side_effect = _tx_side_effect(sell)
    with pytest.raises(NotFoundError):
        await service.update_sell_links(TEST_USER_ID, sell.id, [(uuid.uuid4(), Decimal("5"))])


async def test_update_sell_links_rejects_currency_mismatch(
    service: TransactionService,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    buy = make_transaction(
        type=TransactionType.BUY, quantity=Decimal("10"), currency="EUR", date=date(2024, 1, 1)
    )
    sell = make_transaction(
        type=TransactionType.SELL, quantity=Decimal("5"), currency="USD", date=date(2024, 6, 1)
    )
    mock_transaction_repository.get_by_id.side_effect = _tx_side_effect(sell, buy)
    with pytest.raises(LinkValidationError, match="currency"):
        await service.update_sell_links(TEST_USER_ID, sell.id, [(buy.id, Decimal("5"))])


async def test_update_sell_links_rejects_different_asset(
    service: TransactionService,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    other_asset_id = uuid.uuid4()
    buy = make_transaction(
        type=TransactionType.BUY,
        asset_id=other_asset_id,
        quantity=Decimal("10"),
        date=date(2024, 1, 1),
    )
    sell = make_transaction(
        type=TransactionType.SELL,
        asset_id=TEST_ASSET_ID,
        quantity=Decimal("5"),
        date=date(2024, 6, 1),
    )
    mock_transaction_repository.get_by_id.side_effect = _tx_side_effect(sell, buy)
    with pytest.raises(LinkValidationError, match="asset"):
        await service.update_sell_links(TEST_USER_ID, sell.id, [(buy.id, Decimal("5"))])


async def test_update_sell_links_rejects_buy_after_sell_date(
    service: TransactionService,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    buy = make_transaction(type=TransactionType.BUY, quantity=Decimal("10"), date=date(2024, 12, 1))
    sell = make_transaction(type=TransactionType.SELL, quantity=Decimal("5"), date=date(2024, 6, 1))
    mock_transaction_repository.get_by_id.side_effect = _tx_side_effect(sell, buy)
    with pytest.raises(LinkValidationError, match="date"):
        await service.update_sell_links(TEST_USER_ID, sell.id, [(buy.id, Decimal("5"))])


async def test_update_sell_links_rejects_overallocation_of_sell(
    service: TransactionService,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    """Link quantities exceed sell.quantity."""
    buy = make_transaction(type=TransactionType.BUY, quantity=Decimal("20"), date=date(2024, 1, 1))
    sell = make_transaction(type=TransactionType.SELL, quantity=Decimal("5"), date=date(2024, 6, 1))
    mock_transaction_repository.get_by_id.side_effect = _tx_side_effect(sell, buy)
    mock_link_repository.get_allocated_for_buy_excluding_sell.return_value = Decimal("0")
    with pytest.raises(LinkValidationError, match="quantity"):
        await service.update_sell_links(TEST_USER_ID, sell.id, [(buy.id, Decimal("10"))])


async def test_update_sell_links_rejects_overallocation_of_buy(
    service: TransactionService,
    mock_transaction_repository: AsyncMock,
    mock_link_repository: AsyncMock,
) -> None:
    """Other sells have already consumed 8 of this buy's 10 units, new link wants 5 more."""
    buy = make_transaction(type=TransactionType.BUY, quantity=Decimal("10"), date=date(2024, 1, 1))
    sell = make_transaction(type=TransactionType.SELL, quantity=Decimal("5"), date=date(2024, 6, 1))
    mock_transaction_repository.get_by_id.side_effect = _tx_side_effect(sell, buy)
    mock_link_repository.get_allocated_for_buy_excluding_sell.return_value = Decimal("8")
    with pytest.raises(LinkValidationError, match="overallocated"):
        await service.update_sell_links(TEST_USER_ID, sell.id, [(buy.id, Decimal("5"))])
