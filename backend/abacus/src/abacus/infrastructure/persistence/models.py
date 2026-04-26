import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import func as sa_func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from abacus.infrastructure.persistence.database import Base

_SCHEMA = "abacus"


class AssetModel(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    ticker: Mapped[str | None] = mapped_column(String(32), nullable=True)
    isin: Mapped[str | None] = mapped_column(String(12), nullable=True)
    asset_class: Mapped[str] = mapped_column(
        Enum("stock", "crypto", "fund", "etf", name="asset_class_enum", schema=_SCHEMA),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=sa_func.now())
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=sa_func.now(), onupdate=sa_func.now()
    )

    transactions: Mapped[list["TransactionModel"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )


class TransactionModel(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(f"{_SCHEMA}.assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("buy", "sell", name="transaction_type_enum", schema=_SCHEMA),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(precision=20, scale=8), nullable=False)
    price_per_unit: Mapped[Decimal] = mapped_column(Numeric(precision=20, scale=8), nullable=False)
    fee: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=8), nullable=False, server_default="0"
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    broker: Mapped[str | None] = mapped_column(String(256), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=sa_func.now())
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=sa_func.now(), onupdate=sa_func.now()
    )

    asset: Mapped["AssetModel"] = relationship(back_populates="transactions")
    sell_links: Mapped[list["TransactionLinkModel"]] = relationship(
        "TransactionLinkModel",
        foreign_keys="TransactionLinkModel.sell_id",
        cascade="all, delete-orphan",
    )
    buy_links: Mapped[list["TransactionLinkModel"]] = relationship(
        "TransactionLinkModel",
        foreign_keys="TransactionLinkModel.buy_id",
    )


class TransactionLinkModel(Base):
    __tablename__ = "transaction_links"
    __table_args__ = (
        UniqueConstraint("sell_id", "buy_id", name="uq_transaction_link_sell_buy"),
        CheckConstraint("quantity > 0", name="ck_transaction_link_quantity_positive"),
        {"schema": _SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sell_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(f"{_SCHEMA}.transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    buy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(f"{_SCHEMA}.transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(precision=20, scale=8), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=sa_func.now())
