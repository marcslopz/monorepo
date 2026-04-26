import uuid
from datetime import datetime

from pydantic import BaseModel

from abacus.domain.models.asset import AssetClass


class AssetCreate(BaseModel):
    name: str
    ticker: str | None = None
    isin: str | None = None
    asset_class: AssetClass
    currency: str


class AssetOut(BaseModel):
    id: uuid.UUID
    name: str
    ticker: str | None
    isin: str | None
    asset_class: AssetClass
    currency: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StockSearchResultOut(BaseModel):
    ticker: str
    name: str
    asset_class: AssetClass


class StockProfileOut(BaseModel):
    ticker: str
    name: str
    currency: str
