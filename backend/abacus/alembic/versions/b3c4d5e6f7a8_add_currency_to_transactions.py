"""add_currency_to_transactions

Revision ID: b3c4d5e6f7a8
Revises: a05bf0094fca
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a05bf0094fca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transactions',
        sa.Column('currency', sa.String(length=3), nullable=True),
        schema='abacus',
    )
    op.execute("""
        UPDATE abacus.transactions t
        SET currency = (SELECT a.currency FROM abacus.assets a WHERE a.id = t.asset_id)
    """)
    op.alter_column('transactions', 'currency', nullable=False, schema='abacus')


def downgrade() -> None:
    op.drop_column('transactions', 'currency', schema='abacus')
