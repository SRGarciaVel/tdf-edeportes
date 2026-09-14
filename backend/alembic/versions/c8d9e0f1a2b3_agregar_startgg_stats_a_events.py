"""agregar attendee_count y standings a events

Revision ID: c8d9e0f1a2b3
Revises: b3c4d5e6f7a8
Create Date: 2026-09-13 22:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ambas nullable: solo se llenan para torneos sincronizados desde
    # start.gg (ver sync_startgg_tournaments.py) — un evento tipo
    # stream/reunion/otro, o un torneo cargado a mano sin API, se
    # quedan en NULL sin problema
    op.add_column("events", sa.Column("attendee_count", sa.Integer(), nullable=True))
    op.add_column(
        "events",
        sa.Column("standings", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("events", "standings")
    op.drop_column("events", "attendee_count")
