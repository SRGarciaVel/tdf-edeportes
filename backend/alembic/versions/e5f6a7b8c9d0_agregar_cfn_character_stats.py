"""agregar cfn_character_stats

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-01 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cfn_character_stats",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("cfn_id", sa.String(), nullable=False),
        sa.Column("character_name", sa.String(), nullable=False),
        sa.Column("matches_played", sa.Integer(), nullable=True),
        sa.Column("win_rate", sa.Float(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cfn_id", "character_name", name="uq_cfn_character_stats"),
    )
    op.create_index(
        op.f("ix_cfn_character_stats_cfn_id"),
        "cfn_character_stats",
        ["cfn_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_cfn_character_stats_cfn_id"), table_name="cfn_character_stats"
    )
    op.drop_table("cfn_character_stats")
