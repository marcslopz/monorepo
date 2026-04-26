import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel


class TransactionType(StrEnum):
    BUY = "buy"
    SELL = "sell"


class Transaction(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
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

    model_config = {"from_attributes": True}
