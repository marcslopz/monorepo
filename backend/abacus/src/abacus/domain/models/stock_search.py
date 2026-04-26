from pydantic import BaseModel

from abacus.domain.models.asset import AssetClass


class StockSearchResult(BaseModel):
    ticker: str
    name: str
    asset_class: AssetClass


class StockProfile(BaseModel):
    ticker: str
    name: str
    currency: str
    isin: str | None = None
