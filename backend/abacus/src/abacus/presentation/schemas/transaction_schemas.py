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
    broker: str | None = None
    notes: str | None = None


class TransactionOut(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    date: date
    type: TransactionType
    quantity: Decimal
    price_per_unit: Decimal
    fee: Decimal
    broker: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    total: int
    limit: int
    offset: int
