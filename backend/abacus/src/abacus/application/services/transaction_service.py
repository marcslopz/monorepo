import uuid
from decimal import Decimal
from typing import Any

from abacus.application.services.pnl import RealizedPnL, compute_pnl
from abacus.domain.exceptions import LinkValidationError, NotFoundError
from abacus.domain.models.transaction import Transaction, TransactionType
from abacus.domain.models.transaction_link import TransactionLink
from abacus.domain.ports.repositories import (
    AssetRepository,
    TransactionLinkRepository,
    TransactionRepository,
)


class TransactionService:
    def __init__(
        self,
        asset_repository: AssetRepository,
        transaction_repository: TransactionRepository,
        link_repository: TransactionLinkRepository,
    ) -> None:
        self._asset_repo = asset_repository
        self._tx_repo = transaction_repository
        self._link_repo = link_repository

    async def list_transactions(
        self, user_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[Transaction], int]:
        transactions = await self._tx_repo.list_by_user(user_id, limit, offset)
        total = await self._tx_repo.count_by_user(user_id)
        return transactions, total

    async def list_transactions_enriched(
        self, user_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[tuple[Transaction, list[TransactionLink], RealizedPnL | None]], int]:
        transactions, total = await self.list_transactions(user_id, limit, offset)
        sell_ids = [tx.id for tx in transactions if tx.type == TransactionType.SELL]
        all_links = await self._tx_repo.get_links_for_sells(sell_ids)
        links_by_sell: dict[uuid.UUID, list[TransactionLink]] = {}
        for lnk in all_links:
            links_by_sell.setdefault(lnk.sell_id, []).append(lnk)
        buy_ids = {lnk.buy_id for lnk in all_links}
        buys = await self._tx_repo.list_by_ids(list(buy_ids), user_id)
        buys_by_id = {b.id: b for b in buys}

        result = []
        for tx in transactions:
            if tx.type == TransactionType.SELL:
                links = links_by_sell.get(tx.id, [])
                pnl = compute_pnl(tx, links, buys_by_id)
                result.append((tx, links, pnl))
            else:
                result.append((tx, [], None))
        return result, total

    async def create_transaction(self, user_id: uuid.UUID, data: dict[str, Any]) -> Transaction:
        asset = await self._asset_repo.get_by_id(data["asset_id"], user_id)
        if asset is None:
            raise NotFoundError("Asset", str(data["asset_id"]))
        data["user_id"] = user_id
        if not data.get("currency"):
            data["currency"] = asset.currency
        tx = await self._tx_repo.create(data)
        if tx.type == TransactionType.SELL:
            await self._auto_link_fifo(tx)
        return tx

    async def _auto_link_fifo(self, sell: Transaction) -> None:
        open_buys = await self._tx_repo.list_open_buys(sell.user_id, sell.asset_id, sell.currency)
        remaining = sell.quantity
        links: list[tuple[uuid.UUID, Decimal]] = []
        for buy, buy_remaining in open_buys:
            if remaining <= 0:
                break
            allocated = min(remaining, buy_remaining)
            links.append((buy.id, allocated))
            remaining -= allocated
        await self._link_repo.replace_links_for_sell(sell.id, links)

    async def update_sell_links(
        self,
        user_id: uuid.UUID,
        sell_id: uuid.UUID,
        links_payload: list[tuple[uuid.UUID, Decimal]],
    ) -> tuple[Transaction, list[TransactionLink], RealizedPnL]:
        sell = await self._tx_repo.get_by_id(sell_id, user_id)
        if sell is None:
            raise NotFoundError("Transaction", str(sell_id))

        buys_by_id: dict[uuid.UUID, Transaction] = {}
        qty_per_buy: dict[uuid.UUID, Decimal] = {}
        total_sell_qty = Decimal("0")

        for buy_id, qty in links_payload:
            buy = await self._tx_repo.get_by_id(buy_id, user_id)
            if buy is None:
                raise NotFoundError("Transaction", str(buy_id))
            if buy.currency != sell.currency:
                raise LinkValidationError(
                    f"currency mismatch: buy {buy.currency!r} != sell {sell.currency!r}"
                )
            if buy.asset_id != sell.asset_id:
                raise LinkValidationError(
                    f"asset mismatch: buy asset {buy.asset_id} != sell asset {sell.asset_id}"
                )
            if buy.date > sell.date:
                raise LinkValidationError(
                    f"date: buy date {buy.date} is after sell date {sell.date}"
                )
            already_allocated = await self._link_repo.get_allocated_for_buy_excluding_sell(
                buy_id, sell_id
            )
            if already_allocated + qty > buy.quantity:
                raise LinkValidationError(
                    f"overallocated: buy {buy_id} has {buy.quantity} units but "
                    f"{already_allocated + qty} would be allocated"
                )
            buys_by_id[buy_id] = buy
            qty_per_buy[buy_id] = qty_per_buy.get(buy_id, Decimal("0")) + qty
            total_sell_qty += qty

        if total_sell_qty > sell.quantity:
            raise LinkValidationError(
                f"quantity: links total {total_sell_qty} exceeds sell quantity {sell.quantity}"
            )

        links = await self._link_repo.replace_links_for_sell(
            sell_id, [(buy_id, qty) for buy_id, qty in qty_per_buy.items()]
        )
        pnl = compute_pnl(sell, links, buys_by_id)
        return sell, links, pnl

    async def get_available_buys_for_sell(
        self, user_id: uuid.UUID, sell_id: uuid.UUID
    ) -> tuple[Transaction, list[tuple[Transaction, Decimal, Decimal]]]:
        """Returns (sell, [(buy, qty_available_for_this_sell, qty_currently_linked)])."""
        sell = await self._tx_repo.get_by_id(sell_id, user_id)
        if sell is None:
            raise NotFoundError("Transaction", str(sell_id))
        # Buys where remaining > 0, computed excluding all links
        open_buys = await self._tx_repo.list_open_buys(sell.user_id, sell.asset_id, sell.currency)
        # Current links from this sell to each buy
        current_links = await self._tx_repo.get_links_by_sell(sell_id)
        linked_by_buy = {lnk.buy_id: lnk.quantity for lnk in current_links}

        # Also include buys that are fully consumed by THIS sell but not open otherwise
        already_linked_buy_ids = set(linked_by_buy.keys())
        open_buy_ids = {buy.id for buy, _ in open_buys}
        missing_buy_ids = already_linked_buy_ids - open_buy_ids
        extra_buys: list[tuple[Transaction, Decimal, Decimal]] = []
        if missing_buy_ids:
            extra = await self._tx_repo.list_by_ids(list(missing_buy_ids), user_id)
            for b in extra:
                linked_qty = linked_by_buy.get(b.id, Decimal("0"))
                extra_buys.append((b, linked_qty, linked_qty))

        rows: list[tuple[Transaction, Decimal, Decimal]] = []
        for buy, qty_remaining in open_buys:
            if buy.date > sell.date:
                continue
            linked_qty = linked_by_buy.get(buy.id, Decimal("0"))
            available = qty_remaining + linked_qty  # add back what THIS sell consumed
            rows.append((buy, available, linked_qty))

        return sell, rows + extra_buys

    async def compute_summary_by_asset(
        self, user_id: uuid.UUID
    ) -> list[dict]:
        enriched, _ = await self.list_transactions_enriched(user_id, limit=1000, offset=0)
        summaries: dict[uuid.UUID, dict] = {}
        for tx, _links, pnl in enriched:
            if tx.type != TransactionType.SELL or pnl is None:
                continue
            entry = summaries.setdefault(
                tx.asset_id,
                {
                    "asset_id": tx.asset_id,
                    "currency": tx.currency,
                    "realized_pnl": Decimal("0"),
                    "cost_basis": Decimal("0"),
                    "sells_count": 0,
                },
            )
            entry["realized_pnl"] += pnl.pnl
            entry["cost_basis"] += pnl.cost_basis
            entry["sells_count"] += 1

        # Enrich with asset info
        results = []
        for asset_id, entry in summaries.items():
            asset = await self._asset_repo.get_by_id(asset_id, user_id)
            pnl_pct = (
                entry["realized_pnl"] / entry["cost_basis"] * Decimal("100")
                if entry["cost_basis"]
                else None
            )
            results.append(
                {
                    **entry,
                    "asset_ticker": asset.ticker if asset else None,
                    "asset_name": asset.name if asset else str(asset_id),
                    "realized_pnl_pct": pnl_pct,
                }
            )
        return results

    async def get_sell_pnl(
        self, sell: Transaction
    ) -> tuple[list[TransactionLink], RealizedPnL] | None:
        if sell.type != TransactionType.SELL:
            return None
        links = await self._tx_repo.get_links_by_sell(sell.id)
        if not links:
            return links, compute_pnl(sell, [], {})
        buy_ids = {lnk.buy_id for lnk in links}
        buys_by_id: dict[uuid.UUID, Transaction] = {}
        for buy_id in buy_ids:
            buy = await self._tx_repo.get_by_id(buy_id, sell.user_id)
            if buy:
                buys_by_id[buy_id] = buy
        return links, compute_pnl(sell, links, buys_by_id)
