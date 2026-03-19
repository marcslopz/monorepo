from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.comment import Comment
from app.infrastructure.persistence.models import CommentModel


class SQLAlchemyCommentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, piso_id: int, texto: str) -> Comment:
        comment = CommentModel(piso_id=piso_id, texto=texto)
        self._session.add(comment)
        await self._session.flush()
        await self._session.refresh(comment)
        return Comment.model_validate(comment)

    async def delete(self, piso_id: int, comment_id: int) -> bool:
        result = await self._session.execute(
            select(CommentModel).where(
                CommentModel.id == comment_id,
                CommentModel.piso_id == piso_id,
            )
        )
        comment = result.scalar_one_or_none()
        if comment is None:
            return False
        await self._session.delete(comment)
        await self._session.flush()
        return True
