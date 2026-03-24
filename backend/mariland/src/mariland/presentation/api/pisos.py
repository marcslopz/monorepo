from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from mariland.presentation.dependencies import PisoServiceDep, ScraperDep
from mariland.presentation.schemas.piso_schemas import (
    PisoCreate,
    PisoFromUrlRequest,
    PisoOut,
    PisoUpdate,
)
from mariland.presentation.schemas.sse_events import DoneEvent, ErrorEvent, ProgressEvent

router = APIRouter(prefix="/pisos", tags=["pisos"])


@router.post("/from-url")
async def create_piso_from_url(
    data: PisoFromUrlRequest, scraper: ScraperDep, service: PisoServiceDep
) -> StreamingResponse:
    async def event_stream() -> AsyncGenerator[str, None]:
        async for event in scraper.scrape_piso_stream(data.url):
            if isinstance(event, DoneEvent):
                try:
                    saving = ProgressEvent(step="saving", message="Guardando piso...")
                    yield f"data: {saving.model_dump_json()}\n\n"
                    piso = await service.create_piso(event.piso)
                    piso_out = PisoOut.model_validate(piso)
                    done = DoneEvent(piso=piso_out.model_dump(mode="json"))
                    yield f"data: {done.model_dump_json()}\n\n"
                except Exception as exc:
                    error = ErrorEvent(step="saving", message=str(exc))
                    yield f"data: {error.model_dump_json()}\n\n"
            else:
                yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


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
