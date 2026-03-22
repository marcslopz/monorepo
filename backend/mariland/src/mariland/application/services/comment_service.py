from mariland.domain.exceptions import NotFoundError
from mariland.domain.models.comment import Comment
from mariland.domain.ports.repositories import CommentRepository, PisoRepository


class CommentService:
    def __init__(
        self,
        piso_repository: PisoRepository,
        comment_repository: CommentRepository,
    ) -> None:
        self._piso_repository = piso_repository
        self._comment_repository = comment_repository

    async def add_comment(self, piso_id: int, texto: str) -> Comment:
        piso = await self._piso_repository.get_by_id(piso_id)
        if piso is None:
            raise NotFoundError("Piso", str(piso_id))
        return await self._comment_repository.add(piso_id, texto)

    async def delete_comment(self, piso_id: int, comment_id: int) -> None:
        deleted = await self._comment_repository.delete(piso_id, comment_id)
        if not deleted:
            raise NotFoundError("Comment", str(comment_id))
