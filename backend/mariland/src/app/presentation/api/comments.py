from fastapi import APIRouter

from app.presentation.dependencies import CommentServiceDep
from app.presentation.schemas.piso_schemas import CommentCreate, CommentOut

router = APIRouter(prefix="/pisos", tags=["comments"])


@router.post("/{piso_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(piso_id: int, data: CommentCreate, service: CommentServiceDep) -> CommentOut:
    comment = await service.add_comment(piso_id, data.texto)
    return CommentOut.model_validate(comment)


@router.delete("/{piso_id}/comments/{comment_id}", status_code=204)
async def delete_comment(piso_id: int, comment_id: int, service: CommentServiceDep) -> None:
    await service.delete_comment(piso_id, comment_id)
