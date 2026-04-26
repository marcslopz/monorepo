import uuid
from dataclasses import dataclass
from decimal import Decimal

from abacus.domain.models.transaction import Transaction
from abacus.domain.models.transaction_link import TransactionLink


@dataclass
class RealizedPnL:
    pnl: Decimal
    cost_basis: Decimal
    pnl_pct: Decimal | None
    unlinked_quantity: Decimal


def compute_pnl(
    sell: Transaction,
    links: list[TransactionLink],
    buys_by_id: dict[uuid.UUID, Transaction],
) -> RealizedPnL:
    total_linked = Decimal("0")
    cost_basis = Decimal("0")
    proceeds = Decimal("0")

    for link in links:
        buy = buys_by_id[link.buy_id]
        qty = link.quantity
        total_linked += qty

        buy_fee_alloc = buy.fee * (qty / buy.quantity)
        sell_fee_alloc = sell.fee * (qty / sell.quantity) if sell.quantity else Decimal("0")

        cost_basis += buy.price_per_unit * qty + buy_fee_alloc
        proceeds += sell.price_per_unit * qty - sell_fee_alloc

    pnl = proceeds - cost_basis
    pnl_pct = (pnl / cost_basis * Decimal("100")) if cost_basis else None
    unlinked_quantity = sell.quantity - total_linked

    return RealizedPnL(
        pnl=pnl, cost_basis=cost_basis, pnl_pct=pnl_pct, unlinked_quantity=unlinked_quantity
    )
