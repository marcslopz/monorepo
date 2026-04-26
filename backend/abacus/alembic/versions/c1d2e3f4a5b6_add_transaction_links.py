"""add transaction links

Revision ID: c1d2e3f4a5b6
Revises: b3c4d5e6f7a8
Create Date: 2026-04-26 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c1d2e3f4a5b6"
down_revision: str | None = "b3c4d5e6f7a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SCHEMA = "abacus"


def upgrade() -> None:
    op.create_table(
        "transaction_links",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "sell_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{_SCHEMA}.transactions.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "buy_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{_SCHEMA}.transactions.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("quantity", sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("sell_id", "buy_id", name="uq_transaction_link_sell_buy"),
        sa.CheckConstraint("quantity > 0", name="ck_transaction_link_quantity_positive"),
        schema=_SCHEMA,
    )


def downgrade() -> None:
    op.drop_table("transaction_links", schema=_SCHEMA)
