"""agregar social_links a cfn_registrations

Revision ID: 3f7b9c2d1a6e
Revises: 8a2f6c1e9d34
Create Date: 2026-08-29 05:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "3f7b9c2d1a6e"
down_revision: Union[str, None] = "8a2f6c1e9d34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cfn_registrations",
        sa.Column(
            "social_links",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("cfn_registrations", "social_links")
