"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pisos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(2048), nullable=True),
        sa.Column("direccion", sa.String(512), nullable=True),
        sa.Column("barrio", sa.String(256), nullable=True),
        sa.Column("precio", sa.Integer(), nullable=True),
        sa.Column("habitaciones", sa.Integer(), nullable=True),
        sa.Column("banos", sa.Integer(), nullable=True),
        sa.Column("metros", sa.Integer(), nullable=True),
        sa.Column("planta", sa.String(64), nullable=True),
        sa.Column("ascensor", sa.Boolean(), nullable=True),
        sa.Column("parking", sa.Integer(), nullable=True),
        sa.Column("certificacion_energetica", sa.String(16), nullable=True),
        sa.Column("orientacion", sa.String(32), nullable=True),
        sa.Column("contacto_nombre", sa.String(256), nullable=True),
        sa.Column("contacto_telefono", sa.String(64), nullable=True),
        sa.Column("contacto_inmobiliaria", sa.String(256), nullable=True),
        sa.Column("estado", sa.String(64), nullable=False, server_default="candidato"),
        sa.Column("extras", sa.JSON(), nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pisos_id"), "pisos", ["id"], unique=False)

    op.create_table(
        "price_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("piso_id", sa.Integer(), nullable=False),
        sa.Column("precio", sa.Integer(), nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column(
            "fecha",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["piso_id"], ["pisos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_price_history_id"), "price_history", ["id"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("piso_id", sa.Integer(), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column(
            "fecha",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["piso_id"], ["pisos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_comments_id"), "comments", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_comments_id"), table_name="comments")
    op.drop_table("comments")
    op.drop_index(op.f("ix_price_history_id"), table_name="price_history")
    op.drop_table("price_history")
    op.drop_index(op.f("ix_pisos_id"), table_name="pisos")
    op.drop_table("pisos")
