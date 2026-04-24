import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from abacus.application.services.asset_service import AssetService
from abacus.application.services.transaction_service import TransactionService
from abacus.infrastructure.auth.dependencies import get_current_user_id
from abacus.infrastructure.persistence.database import get_session
from abacus.infrastructure.persistence.repositories.sqlalchemy_asset_repository import (
    SQLAlchemyAssetRepository,
)
from abacus.infrastructure.persistence.repositories.sqlalchemy_transaction_repository import (
    SQLAlchemyTransactionRepository,
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]
CurrentUser = Annotated[uuid.UUID, Depends(get_current_user_id)]


def get_asset_service(session: SessionDep) -> AssetService:
    return AssetService(repository=SQLAlchemyAssetRepository(session))


def get_transaction_service(session: SessionDep) -> TransactionService:
    asset_repo = SQLAlchemyAssetRepository(session)
    tx_repo = SQLAlchemyTransactionRepository(session)
    return TransactionService(asset_repository=asset_repo, transaction_repository=tx_repo)


AssetServiceDep = Annotated[AssetService, Depends(get_asset_service)]
TransactionServiceDep = Annotated[TransactionService, Depends(get_transaction_service)]
