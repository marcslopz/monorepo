from typing import Any

from mariland.domain.exceptions import NotFoundError
from mariland.domain.models.piso import Piso
from mariland.domain.ports.repositories import PisoRepository


class PisoService:
    def __init__(self, repository: PisoRepository) -> None:
        self._repository = repository

    async def list_pisos(self) -> list[Piso]:
        return await self._repository.list_all()

    async def get_piso(self, piso_id: int) -> Piso:
        piso = await self._repository.get_by_id(piso_id)
        if piso is None:
            raise NotFoundError("Piso", str(piso_id))
        return piso

    async def create_piso(self, data: dict[str, Any]) -> Piso:
        return await self._repository.create(data)

    async def update_piso(self, piso_id: int, data: dict[str, Any]) -> Piso:
        piso = await self._repository.update(piso_id, data)
        if piso is None:
            raise NotFoundError("Piso", str(piso_id))
        return piso

    async def delete_piso(self, piso_id: int) -> None:
        deleted = await self._repository.delete(piso_id)
        if not deleted:
            raise NotFoundError("Piso", str(piso_id))
