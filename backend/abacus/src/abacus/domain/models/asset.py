import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class AssetClass(StrEnum):
    STOCK = "stock"
    CRYPTO = "crypto"
    FUND = "fund"
    ETF = "etf"


class Asset(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    ticker: str | None
    isin: str | None
    asset_class: AssetClass
    currency: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
