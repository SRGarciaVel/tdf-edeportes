"""crear cfn_character_mr_history

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-09-12 02:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cfn_character_mr_history",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column("cfn_id", sa.String(), nullable=False),
        sa.Column("character_name", sa.String(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("master_rating", sa.Integer(), nullable=True),
        sa.Column("tier", sa.String(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "cfn_id",
            "character_name",
            "snapshot_date",
            name="uq_cfn_character_mr_history",
        ),
    )
    op.create_index(
        "ix_cfn_character_mr_history_cfn_id",
        "cfn_character_mr_history",
        ["cfn_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_cfn_character_mr_history_cfn_id", table_name="cfn_character_mr_history"
    )
    op.drop_table("cfn_character_mr_history")
