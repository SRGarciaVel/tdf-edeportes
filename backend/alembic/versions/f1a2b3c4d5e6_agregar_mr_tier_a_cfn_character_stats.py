"""agregar master_rating y tier a cfn_character_stats

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-09-12 01:15:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cfn_character_stats", sa.Column("master_rating", sa.Integer(), nullable=True)
    )
    op.add_column("cfn_character_stats", sa.Column("tier", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("cfn_character_stats", "tier")
    op.drop_column("cfn_character_stats", "master_rating")
