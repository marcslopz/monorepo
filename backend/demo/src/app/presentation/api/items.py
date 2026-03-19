from uuid import UUID

from fastapi import APIRouter, Query, status

from app.domain.models.item import Item
from app.presentation.dependencies import ItemServiceDep
from app.presentation.schemas.item_schemas import (
    ItemCreate,
    ItemListResponse,
    ItemResponse,
    ItemUpdate,
)

router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=ItemListResponse)
async def list_items(
    service: ItemServiceDep,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> ItemListResponse:
    items: list[Item] = await service.list_items(limit=limit, offset=offset)
    return ItemListResponse(
        items=[ItemResponse.model_validate(item) for item in items],
        total=len(items),
    )


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate, service: ItemServiceDep) -> ItemResponse:
    item = await service.create_item(name=payload.name, description=payload.description)
    return ItemResponse.model_validate(item)


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: UUID, service: ItemServiceDep) -> ItemResponse:
    item = await service.get_item(item_id)
    return ItemResponse.model_validate(item)


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: UUID, payload: ItemUpdate, service: ItemServiceDep) -> ItemResponse:
    item = await service.update_item(item_id, name=payload.name, description=payload.description)
    return ItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: UUID, service: ItemServiceDep) -> None:
    await service.delete_item(item_id)
