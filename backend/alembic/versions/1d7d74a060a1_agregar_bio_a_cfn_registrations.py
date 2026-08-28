"""agregar bio a cfn_registrations

Revision ID: 1d7d74a060a1
Revises: 5fa04f7df878
Create Date: 2026-08-28 22:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1d7d74a060a1"
down_revision: Union[str, None] = "5fa04f7df878"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cfn_registrations",
        sa.Column("bio", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("cfn_registrations", "bio")
