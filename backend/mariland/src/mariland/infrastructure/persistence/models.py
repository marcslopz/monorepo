from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from mariland.infrastructure.persistence.database import Base


class PisoModel(Base):
    __tablename__ = "pisos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    imagen_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(512), nullable=True)
    barrio: Mapped[str | None] = mapped_column(String(256), nullable=True)
    precio: Mapped[int | None] = mapped_column(Integer, nullable=True)
    habitaciones: Mapped[int | None] = mapped_column(Integer, nullable=True)
    banos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metros: Mapped[int | None] = mapped_column(Integer, nullable=True)
    planta: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ascensor: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    parking: Mapped[int | None] = mapped_column(Integer, nullable=True)
    certificacion_energetica: Mapped[str | None] = mapped_column(String(16), nullable=True)
    orientacion: Mapped[str | None] = mapped_column(String(32), nullable=True)
    contacto_nombre: Mapped[str | None] = mapped_column(String(256), nullable=True)
    contacto_telefono: Mapped[str | None] = mapped_column(String(64), nullable=True)
    contacto_inmobiliaria: Mapped[str | None] = mapped_column(String(256), nullable=True)
    estado: Mapped[str] = mapped_column(String(64), nullable=False, default="candidato")
    owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extras: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, default=dict)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    price_history: Mapped[list["PriceHistoryModel"]] = relationship(
        "PriceHistoryModel",
        back_populates="piso",
        cascade="all, delete-orphan",
        order_by="PriceHistoryModel.fecha.desc()",
    )
    comments: Mapped[list["CommentModel"]] = relationship(
        "CommentModel",
        back_populates="piso",
        cascade="all, delete-orphan",
        order_by="CommentModel.fecha.desc()",
    )


class PriceHistoryModel(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    piso_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pisos.id", ondelete="CASCADE"), nullable=False
    )
    precio: Mapped[int] = mapped_column(Integer, nullable=False)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    piso: Mapped["PisoModel"] = relationship("PisoModel", back_populates="price_history")


class CommentModel(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    piso_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pisos.id", ondelete="CASCADE"), nullable=False
    )
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    piso: Mapped["PisoModel"] = relationship("PisoModel", back_populates="comments")
