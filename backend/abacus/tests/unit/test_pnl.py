import uuid
from datetime import UTC, datetime
from decimal import Decimal

from abacus.application.services.pnl import compute_pnl
from abacus.domain.models.transaction import TransactionType
from abacus.domain.models.transaction_link import TransactionLink
from tests.conftest import make_transaction

_NOW = datetime.now(tz=UTC)
BUY = TransactionType.BUY
SELL = TransactionType.SELL
D = Decimal


def make_link(sell_id: uuid.UUID, buy_id: uuid.UUID, quantity: str) -> TransactionLink:
    return TransactionLink(
        id=uuid.uuid4(),
        sell_id=sell_id,
        buy_id=buy_id,
        quantity=D(quantity),
        created_at=_NOW,
    )


def test_compute_pnl_simple_no_fees() -> None:
    """Buy 10@100, sell 10@120 → pnl=200, cost_basis=1000, pct=20%."""
    buy = make_transaction(type=BUY, quantity=D("10"), price_per_unit=D("100"), fee=D("0"))
    sell = make_transaction(type=SELL, quantity=D("10"), price_per_unit=D("120"), fee=D("0"))
    link = make_link(sell.id, buy.id, "10")

    result = compute_pnl(sell, [link], {buy.id: buy})

    assert result.pnl == D("200")
    assert result.cost_basis == D("1000")
    assert result.pnl_pct == D("20")
    assert result.unlinked_quantity == D("0")


def test_compute_pnl_with_fees_reduces_profit() -> None:
    """Buy 10@100 fee=5, sell 10@120 fee=5 → pnl=200-5-5=190."""
    buy = make_transaction(type=BUY, quantity=D("10"), price_per_unit=D("100"), fee=D("5"))
    sell = make_transaction(type=SELL, quantity=D("10"), price_per_unit=D("120"), fee=D("5"))
    link = make_link(sell.id, buy.id, "10")

    result = compute_pnl(sell, [link], {buy.id: buy})

    assert result.pnl == D("190")
    assert result.cost_basis == D("1005")
    assert result.unlinked_quantity == D("0")


def test_compute_pnl_loss() -> None:
    """Buy 10@100, sell 10@80 → pnl=-200."""
    buy = make_transaction(type=BUY, quantity=D("10"), price_per_unit=D("100"), fee=D("0"))
    sell = make_transaction(type=SELL, quantity=D("10"), price_per_unit=D("80"), fee=D("0"))
    link = make_link(sell.id, buy.id, "10")

    result = compute_pnl(sell, [link], {buy.id: buy})

    assert result.pnl == D("-200")
    assert result.pnl_pct == D("-20")


def test_compute_pnl_partial_sell_unlinked() -> None:
    """Sell 10 but only 6 linked → unlinked=4, pnl only from linked qty."""
    buy = make_transaction(type=BUY, quantity=D("10"), price_per_unit=D("100"), fee=D("0"))
    sell = make_transaction(type=SELL, quantity=D("10"), price_per_unit=D("120"), fee=D("0"))
    link = make_link(sell.id, buy.id, "6")

    result = compute_pnl(sell, [link], {buy.id: buy})

    assert result.unlinked_quantity == D("4")
    assert result.pnl == D("120")  # 6*(120-100)
    assert result.cost_basis == D("600")


def test_compute_pnl_multi_buy_fifo() -> None:
    """Buy 10@100 + 5@160, sell 12 linked to both buys."""
    buy1 = make_transaction(type=BUY, quantity=D("10"), price_per_unit=D("100"), fee=D("0"))
    buy2 = make_transaction(type=BUY, quantity=D("5"), price_per_unit=D("160"), fee=D("0"))
    sell = make_transaction(type=SELL, quantity=D("12"), price_per_unit=D("150"), fee=D("0"))
    link1 = make_link(sell.id, buy1.id, "10")
    link2 = make_link(sell.id, buy2.id, "2")

    result = compute_pnl(sell, [link1, link2], {buy1.id: buy1, buy2.id: buy2})

    # sell proceeds: 12*150 = 1800
    # buy cost: 10*100 + 2*160 = 1000 + 320 = 1320
    assert result.pnl == D("480")
    assert result.cost_basis == D("1320")
    assert result.unlinked_quantity == D("0")


def test_compute_pnl_fee_prorated_on_partial_buy() -> None:
    """Buy 10@100 fee=10 (1/unit), link 5 only → buy fee allocated = 5."""
    buy = make_transaction(type=BUY, quantity=D("10"), price_per_unit=D("100"), fee=D("10"))
    sell = make_transaction(type=SELL, quantity=D("5"), price_per_unit=D("110"), fee=D("0"))
    link = make_link(sell.id, buy.id, "5")

    result = compute_pnl(sell, [link], {buy.id: buy})

    # buy_cost_alloc = 5*100 + 10*(5/10) = 500 + 5 = 505
    # sell_proceeds = 5*110 = 550, pnl = 45
    assert result.pnl == D("45")
    assert result.cost_basis == D("505")


def test_compute_pnl_no_links_all_unlinked() -> None:
    """No links → pnl=0, cost_basis=0, pct=None, unlinked=sell.qty."""
    sell = make_transaction(type=SELL, quantity=D("10"), price_per_unit=D("120"), fee=D("0"))

    result = compute_pnl(sell, [], {})

    assert result.pnl == D("0")
    assert result.cost_basis == D("0")
    assert result.pnl_pct is None
    assert result.unlinked_quantity == D("10")
