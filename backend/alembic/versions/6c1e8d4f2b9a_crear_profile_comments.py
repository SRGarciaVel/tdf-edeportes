"""crear profile_comments

Revision ID: 6c1e8d4f2b9a
Revises: 3f7b9c2d1a6e
Create Date: 2026-08-29 05:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "6c1e8d4f2b9a"
down_revision: Union[str, None] = "3f7b9c2d1a6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "profile_comments",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column("cfn_id", sa.String(), nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["cfn_id"], ["cfn_registrations.cfn_id"]),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"]),
    )
    op.create_index("ix_profile_comments_cfn_id", "profile_comments", ["cfn_id"])


def downgrade() -> None:
    op.drop_index("ix_profile_comments_cfn_id", table_name="profile_comments")
    op.drop_table("profile_comments")
