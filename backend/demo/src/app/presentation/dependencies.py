from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.item_service import ItemService
from app.infrastructure.cache.noop_cache import NoopCacheService
from app.infrastructure.persistence.database import get_session
from app.infrastructure.persistence.repositories.sqlalchemy_item_repository import (
    SQLAlchemyItemRepository,
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_item_service(session: SessionDep) -> ItemService:
    repository = SQLAlchemyItemRepository(session)
    cache = NoopCacheService()
    return ItemService(repository=repository, cache=cache)


ItemServiceDep = Annotated[ItemService, Depends(get_item_service)]
