"""agregar creator_name y template_name a tier_lists

Revision ID: 6876a60d4109
Revises: 227b75ca4a41
Create Date: 2026-08-17 23:59:15.648806

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6876a60d4109"
down_revision: Union[str, None] = "227b75ca4a41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default temporal: la tabla puede tener filas de antes de
    # este cambio (tier lists ya guardadas sin creator_name). Con el
    # default, esas filas quedan en "Anónimo" en vez de romper el ADD
    # COLUMN NOT NULL. Se saca el default al final para que de acá en
    # más el valor lo decida siempre la app en cada insert (ver
    # app/api/tier_lists.py, create_tier_list), no la base.
    op.add_column(
        "tier_lists",
        sa.Column(
            "creator_name", sa.String(), nullable=False, server_default="Anónimo"
        ),
    )
    op.add_column("tier_lists", sa.Column("template_name", sa.String(), nullable=True))
    op.alter_column("tier_lists", "creator_name", server_default=None)


def downgrade() -> None:
    op.drop_column("tier_lists", "template_name")
    op.drop_column("tier_lists", "creator_name")
