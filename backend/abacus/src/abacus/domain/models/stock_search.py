from pydantic import BaseModel

from abacus.domain.models.asset import AssetClass


class StockSearchResult(BaseModel):
    ticker: str
    name: str
    asset_class: AssetClass
