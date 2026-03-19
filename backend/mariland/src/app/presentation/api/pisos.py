from fastapi import APIRouter

from app.presentation.dependencies import PisoServiceDep
from app.presentation.schemas.piso_schemas import PisoCreate, PisoOut, PisoUpdate

router = APIRouter(prefix="/pisos", tags=["pisos"])


@router.get("/", response_model=list[PisoOut])
async def list_pisos(service: PisoServiceDep) -> list[PisoOut]:
    pisos = await service.list_pisos()
    return [PisoOut.model_validate(p) for p in pisos]


@router.get("/{piso_id}", response_model=PisoOut)
async def get_piso(piso_id: int, service: PisoServiceDep) -> PisoOut:
    piso = await service.get_piso(piso_id)
    return PisoOut.model_validate(piso)


@router.post("/", response_model=PisoOut, status_code=201)
async def create_piso(data: PisoCreate, service: PisoServiceDep) -> PisoOut:
    piso = await service.create_piso(data.model_dump())
    return PisoOut.model_validate(piso)


@router.put("/{piso_id}", response_model=PisoOut)
async def update_piso(piso_id: int, data: PisoUpdate, service: PisoServiceDep) -> PisoOut:
    piso = await service.update_piso(piso_id, data.model_dump(exclude_none=True))
    return PisoOut.model_validate(piso)


@router.delete("/{piso_id}", status_code=204)
async def delete_piso(piso_id: int, service: PisoServiceDep) -> None:
    await service.delete_piso(piso_id)
