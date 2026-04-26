import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from abacus.domain.models.transaction import TransactionType


class TransactionCreate(BaseModel):
    asset_id: uuid.UUID
    date: date
    type: TransactionType
    quantity: Decimal = Field(gt=0)
    price_per_unit: Decimal
    fee: Decimal = Decimal("0")
    currency: str | None = None
    broker: str | None = None
    notes: str | None = None


class TransactionLinkOut(BaseModel):
    id: uuid.UUID
    sell_id: uuid.UUID
    buy_id: uuid.UUID
    quantity: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionOut(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    date: date
    type: TransactionType
    quantity: Decimal
    price_per_unit: Decimal
    fee: Decimal
    currency: str
    broker: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    # P&L fields — only populated for SELL transactions
    realized_pnl: Decimal | None = None
    realized_pnl_pct: Decimal | None = None
    cost_basis: Decimal | None = None
    unlinked_quantity: Decimal | None = None
    links: list[TransactionLinkOut] = []

    model_config = {"from_attributes": True}


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    total: int
    limit: int
    offset: int


class LinksUpdateRequest(BaseModel):
    links: list[tuple[uuid.UUID, Decimal]]


class AvailableBuyOut(BaseModel):
    buy: TransactionOut
    qty_available: Decimal
    qty_linked: Decimal


class AvailableBuysResponse(BaseModel):
    sell: TransactionOut
    available_buys: list[AvailableBuyOut]


class AssetPnLSummary(BaseModel):
    asset_id: uuid.UUID
    asset_ticker: str | None
    asset_name: str
    currency: str
    realized_pnl: Decimal
    cost_basis: Decimal
    realized_pnl_pct: Decimal | None
    sells_count: int
