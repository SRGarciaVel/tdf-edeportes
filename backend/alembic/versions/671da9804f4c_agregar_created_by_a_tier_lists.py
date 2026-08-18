"""agregar created_by a tier_lists

Revision ID: 671da9804f4c
Revises: 36eb95ef2a18
Create Date: 2026-08-18 23:01:14.279911

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "671da9804f4c"
down_revision: Union[str, None] = "36eb95ef2a18"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tier_lists", sa.Column("created_by", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "tier_lists_created_by_fkey",
        "tier_lists",
        "users",
        ["created_by"],
        ["id"],
    )


def downgrade() -> None:
    # el nombre del constraint NO puede ser None acá (a diferencia de lo
    # que generó el autogenerate) — el proyecto no tiene naming_convention
    # configurado en la metadata, así que Postgres necesita el nombre real
    # para poder borrarlo. Confirmado contra Postgres real después de
    # aplicar el upgrade: el nombre que Postgres le puso solo es
    # "tier_lists_created_by_fkey" (la convención default de Postgres,
    # <tabla>_<columna>_fkey).
    op.drop_constraint("tier_lists_created_by_fkey", "tier_lists", type_="foreignkey")
    op.drop_column("tier_lists", "created_by")
