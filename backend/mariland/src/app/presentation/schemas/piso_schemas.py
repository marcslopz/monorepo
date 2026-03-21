from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PriceHistoryCreate(BaseModel):
    precio: int
    notas: str | None = None


class PriceHistoryOut(BaseModel):
    id: int
    piso_id: int
    precio: int
    notas: str | None
    fecha: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    texto: str


class CommentOut(BaseModel):
    id: int
    piso_id: int
    texto: str
    fecha: datetime

    model_config = {"from_attributes": True}


class PisoCreate(BaseModel):
    url: str | None = None
    imagen_url: str | None = None
    direccion: str | None = None
    barrio: str | None = None
    precio: int | None = None
    habitaciones: int | None = None
    banos: int | None = None
    metros: int | None = None
    planta: str | None = None
    ascensor: bool | None = None
    parking: int | None = None
    certificacion_energetica: str | None = None
    orientacion: str | None = None
    contacto_nombre: str | None = None
    contacto_telefono: str | None = None
    contacto_inmobiliaria: str | None = None
    estado: str = "candidato"
    extras: dict[str, Any] | None = None
    notas: str | None = None


class PisoUpdate(BaseModel):
    url: str | None = None
    imagen_url: str | None = None
    direccion: str | None = None
    barrio: str | None = None
    precio: int | None = None
    habitaciones: int | None = None
    banos: int | None = None
    metros: int | None = None
    planta: str | None = None
    ascensor: bool | None = None
    parking: int | None = None
    certificacion_energetica: str | None = None
    orientacion: str | None = None
    contacto_nombre: str | None = None
    contacto_telefono: str | None = None
    contacto_inmobiliaria: str | None = None
    estado: str | None = None
    extras: dict[str, Any] | None = None
    notas: str | None = None


class PisoOut(BaseModel):
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
    extras: dict[str, Any] | None
    notas: str | None
    created_at: datetime
    updated_at: datetime
    price_history: list[PriceHistoryOut] = []
    comments: list[CommentOut] = []

    model_config = {"from_attributes": True}
