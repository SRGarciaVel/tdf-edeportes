"""agregar banner_url a cfn_registrations

Revision ID: 8a2f6c1e9d34
Revises: 1d7d74a060a1
Create Date: 2026-08-29 04:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8a2f6c1e9d34"
down_revision: Union[str, None] = "1d7d74a060a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cfn_registrations",
        sa.Column("banner_url", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("cfn_registrations", "banner_url")
