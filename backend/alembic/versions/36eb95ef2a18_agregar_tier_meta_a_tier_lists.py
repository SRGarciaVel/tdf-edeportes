"""agregar tier_meta a tier_lists

Revision ID: 36eb95ef2a18
Revises: 6876a60d4109
Create Date: 2026-08-18 22:43:36.353982

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "36eb95ef2a18"
down_revision: Union[str, None] = "6876a60d4109"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default='[]': las tier lists guardadas antes de este cambio
    # no tienen tier_meta — quedan con array vacío, y el frontend cae a un
    # fallback (orden alfabético de las keys de tiers, con colores por
    # índice) para esos casos viejos en vez de romper. De acá en más,
    # tiers nuevas siempre mandan tier_meta con el orden real.
    op.add_column(
        "tier_lists",
        sa.Column(
            "tier_meta",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("tier_lists", "tier_meta")
