from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from mariland.application.services.comment_service import CommentService
from mariland.application.services.piso_service import PisoService
from mariland.application.services.price_service import PriceService
from mariland.config import settings
from mariland.domain.ports.fetcher import UrlFetcherPort
from mariland.infrastructure.persistence.database import get_session
from mariland.infrastructure.persistence.repositories.sqlalchemy_comment_repository import (
    SQLAlchemyCommentRepository,
)
from mariland.infrastructure.persistence.repositories.sqlalchemy_piso_repository import (
    SQLAlchemyPisoRepository,
)
from mariland.infrastructure.persistence.repositories.sqlalchemy_price_repository import (
    SQLAlchemyPriceHistoryRepository,
)
from mariland.infrastructure.scraping.jina_fetcher import JinaFetcher
from mariland.infrastructure.scraping.llm_scraper import LlmScraper
from mariland.infrastructure.scraping.scrapingbee_fetcher import ScrapingBeeFetcher

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


def get_scraper() -> LlmScraper:
    fetcher: UrlFetcherPort
    if settings.scrapingbee_api_key:
        fetcher = ScrapingBeeFetcher(api_key=settings.scrapingbee_api_key)
    else:
        fetcher = JinaFetcher(api_key=settings.jina_api_key)
    return LlmScraper(fetcher=fetcher, anthropic_api_key=settings.anthropic_api_key)


PisoServiceDep = Annotated[PisoService, Depends(get_piso_service)]
PriceServiceDep = Annotated[PriceService, Depends(get_price_service)]
CommentServiceDep = Annotated[CommentService, Depends(get_comment_service)]
ScraperDep = Annotated[LlmScraper, Depends(get_scraper)]
