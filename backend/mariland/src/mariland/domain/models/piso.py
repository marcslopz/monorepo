from datetime import datetime
from typing import Any

from pydantic import BaseModel

from mariland.domain.models.comment import Comment
from mariland.domain.models.price_history import PriceHistory


class Piso(BaseModel):
    id: int
    url: str | None
    imagen_url: str | None
    direccion: str | None
    barrio: str | None
    precio: int | None
    habitaciones: int | None
    banos: int | None
    metros: int | None
    planta: str | None
    ascensor: bool | None
    parking: int | None
    certificacion_energetica: str | None
    orientacion: str | None
    contacto_nombre: str | None
    contacto_telefono: str | None
    contacto_inmobiliaria: str | None
    estado: str
    owner: str | None
    extras: dict[str, Any] | None
    notas: str | None
    created_at: datetime
    updated_at: datetime
    price_history: list[PriceHistory] = []
    comments: list[Comment] = []

    model_config = {"from_attributes": True}
