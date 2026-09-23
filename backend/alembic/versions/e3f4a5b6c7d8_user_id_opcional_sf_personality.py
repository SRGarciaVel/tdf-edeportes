"""hacer user_id opcional en sf_personality_results

Revision ID: e3f4a5b6c7d8
Revises: d1e2f3a4b5c6
Create Date: 2026-09-22 18:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ahora se guarda un resultado por CUALQUIERA que termine el test,
    # no solo usuarios logueados (pedido de Seba, 22-09-2026: "no
    # todos van a loguearse, mejor que el volumen no dependa de eso")
    # -- user_id queda NULL para los invitados. La restricción UNIQUE
    # sigue intacta: Postgres permite multiples NULL en una columna
    # UNIQUE sin conflicto entre si, así que un usuario logueado sigue
    # limitado a una sola fila, y los invitados no chocan nunca entre
    # ellos.
    op.alter_column(
        "sf_personality_results",
        "user_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "sf_personality_results",
        "user_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        nullable=False,
    )
