"""sembrar roster actual en cfn_registrations

Revision ID: b7e7dd7cf3e5
Revises: 9138c2c07243
Create Date: 2026-08-19 22:12:22.382240

"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7e7dd7cf3e5"
down_revision: Union[str, None] = "9138c2c07243"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# el roster que hasta ahora vivía hardcodeado en dos lugares (PLAYERS en
# scripts/refresh_cfn.py, y ALL_PLAYERS en JugadoresPage.tsx) — migrado
# acá con status="approved" para no perder a nadie al pasar a este
# sistema. user_id/reviewed_by quedan en null: es historia, no una
# aprobación puntual de alguien de staff. Craime y Blaz siguen sin
# entrar, mismo motivo de siempre (no se les preguntó antes de
# agregarlos la primera vez) — sus CFN ID quedan documentados en
# SPECS.md §12 por si confirman más adelante.
ROSTER: list[dict] = [
    {"cfn_id": "2844671427", "display_name": "Sirxtias", "is_tdf": True},
    {"cfn_id": "2908057346", "display_name": "Drachen", "is_tdf": True},
    {"cfn_id": "4100957688", "display_name": "BazthyFreeman", "is_tdf": True},
    {"cfn_id": "1733837998", "display_name": "AckermanFG", "is_tdf": True},
    {"cfn_id": "1964247128", "display_name": "TDF Super Ñema", "is_tdf": True},
    {"cfn_id": "2281859090", "display_name": "Jager Eins", "is_tdf": True},
    {"cfn_id": "2449521700", "display_name": "Zackito", "is_tdf": True},
    {
        "cfn_id": "1027356162",
        "display_name": "Younghou",
        "is_tdf": False,
        "liquipedia_url": "https://liquipedia.net/fighters/Younghou",
    },
    {
        "cfn_id": "3987753314",
        "display_name": "Pochoclo23",
        "is_tdf": False,
        "liquipedia_url": "https://liquipedia.net/fighters/Pochoclo23",
    },
]

cfn_registrations = sa.table(
    "cfn_registrations",
    sa.column("id", sa.UUID()),
    sa.column("cfn_id", sa.String()),
    sa.column("display_name", sa.String()),
    sa.column("status", sa.String()),
    sa.column("is_tdf", sa.Boolean()),
    sa.column("liquipedia_url", sa.String()),
)


def upgrade() -> None:
    op.bulk_insert(
        cfn_registrations,
        [
            {
                "id": uuid.uuid4(),
                "cfn_id": p["cfn_id"],
                "display_name": p["display_name"],
                "status": "approved",
                "is_tdf": p["is_tdf"],
                "liquipedia_url": p.get("liquipedia_url"),
            }
            for p in ROSTER
        ],
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        cfn_registrations.delete().where(
            cfn_registrations.c.cfn_id.in_([p["cfn_id"] for p in ROSTER])
        )
    )
