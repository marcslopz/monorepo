import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from abacus.application.services.asset_service import AssetService
from abacus.application.services.transaction_service import TransactionService
from abacus.config import settings
from abacus.domain.ports.stock_search import StockSearchPort
from abacus.infrastructure.auth.dependencies import get_current_user_id
from abacus.infrastructure.external.finnhub_client import FinnhubStockSearchClient
from abacus.infrastructure.external.noop_stock_search import NoopStockSearch
from abacus.infrastructure.persistence.database import get_session
from abacus.infrastructure.persistence.repositories.sqlalchemy_asset_repository import (
    SQLAlchemyAssetRepository,
)
from abacus.infrastructure.persistence.repositories.sqlalchemy_transaction_link_repository import (
    SQLAlchemyTransactionLinkRepository,
)
from abacus.infrastructure.persistence.repositories.sqlalchemy_transaction_repository import (
    SQLAlchemyTransactionRepository,
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]
CurrentUser = Annotated[uuid.UUID, Depends(get_current_user_id)]


def get_stock_search_port() -> StockSearchPort:
    if settings.finnhub_api_key:
        return FinnhubStockSearchClient(
            api_key=settings.finnhub_api_key,
            base_url=settings.finnhub_base_url,
        )
    return NoopStockSearch()


StockSearchPortDep = Annotated[StockSearchPort, Depends(get_stock_search_port)]


def get_asset_service(session: SessionDep, port: StockSearchPortDep) -> AssetService:
    return AssetService(
        repository=SQLAlchemyAssetRepository(session),
        stock_search_port=port,
    )


def get_transaction_service(session: SessionDep) -> TransactionService:
    asset_repo = SQLAlchemyAssetRepository(session)
    tx_repo = SQLAlchemyTransactionRepository(session)
    link_repo = SQLAlchemyTransactionLinkRepository(session)
    return TransactionService(
        asset_repository=asset_repo,
        transaction_repository=tx_repo,
        link_repository=link_repo,
    )


AssetServiceDep = Annotated[AssetService, Depends(get_asset_service)]
TransactionServiceDep = Annotated[TransactionService, Depends(get_transaction_service)]
