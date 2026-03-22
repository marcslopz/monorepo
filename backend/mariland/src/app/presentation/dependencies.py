from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.comment_service import CommentService
from app.application.services.piso_service import PisoService
from app.application.services.price_service import PriceService
from app.config import settings
from app.infrastructure.persistence.database import get_session
from app.infrastructure.persistence.repositories.sqlalchemy_comment_repository import (
    SQLAlchemyCommentRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_piso_repository import (
    SQLAlchemyPisoRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_price_repository import (
    SQLAlchemyPriceHistoryRepository,
)
from app.infrastructure.scraping.jina_anthropic_scraper import JinaAnthropicScraper

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_piso_service(session: SessionDep) -> PisoService:
    return PisoService(repository=SQLAlchemyPisoRepository(session))


def get_price_service(session: SessionDep) -> PriceService:
    piso_repo = SQLAlchemyPisoRepository(session)
    price_repo = SQLAlchemyPriceHistoryRepository(session)
    return PriceService(piso_repository=piso_repo, price_repository=price_repo)


def get_comment_service(session: SessionDep) -> CommentService:
    piso_repo = SQLAlchemyPisoRepository(session)
    comment_repo = SQLAlchemyCommentRepository(session)
    return CommentService(piso_repository=piso_repo, comment_repository=comment_repo)


def get_scraper() -> JinaAnthropicScraper:
    return JinaAnthropicScraper(
        anthropic_api_key=settings.anthropic_api_key,
        jina_api_key=settings.jina_api_key,
    )


PisoServiceDep = Annotated[PisoService, Depends(get_piso_service)]
PriceServiceDep = Annotated[PriceService, Depends(get_price_service)]
CommentServiceDep = Annotated[CommentService, Depends(get_comment_service)]
ScraperDep = Annotated[JinaAnthropicScraper, Depends(get_scraper)]
