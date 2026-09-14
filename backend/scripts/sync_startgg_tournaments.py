"""Sincroniza torneos reales que TDF organizó en start.gg hacia la
tabla `events` — reemplaza la necesidad de cargarlos a mano en el
calendario, y trae la fecha real en vez de tener que adivinarla
(problema real encontrado 13-09-2026: el sitio mostraba "0 torneos"
porque nunca se habían cargado, y no había forma de confirmar las
fechas reales sin esto).

Uso:
    docker compose exec backend python scripts/sync_startgg_tournaments.py

Requiere STARTGG_API_TOKEN configurado (ver app/services/startgg.py).

A diferencia del tracker de CFN, esto NO corre por cron — son torneos
ya realizados, su nombre/fecha no cambia. Se corre una vez para cada
torneo nuevo que se agregue a TOURNAMENT_SLUGS de acá abajo (no hace
falta re-sincronizar los que ya están: es idempotente por
`external_url`, así que además no hace daño correrlo de nuevo).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func

from app.core.database import SessionLocal
from app.models import Event, User
from app.services.startgg import StartGGError, fetch_tournament

# torneos reales organizados por TDF (pedido de Seba, 13-09-2026) —
# agregar acá cada torneo nuevo y volver a correr el script
TOURNAMENT_SLUGS = [
    "torneo-de-funados-segundo-impacto",
    "tdf-fighting-summit",
    "tdf-x-hazt-double-rush-tournament",
]

# a quién se le atribuye la creación del evento (columna NOT NULL en
# events.created_by) — AckermanFG es quien corre estos scripts
# (seed_staff.py lo tiene como "Programador")
# a quién se le atribuye la creación del evento (columna NOT NULL en
# events.created_by) — AckermanFG es quien corre estos scripts
# (seed_staff.py lo tiene como "Programador"). En minúsculas a
# propósito: twitch_username se guarda desde el campo "login" de la
# API de Twitch, que siempre viene en minúsculas (a diferencia de
# display_name, que sí conserva la casing real) — bug real encontrado
# 13-09-2026, la primera versión tenía "AckermanFG" y nunca
# encontraba al usuario.
CREATED_BY_USERNAME = "ackermanfg"


def sync_tournament(db, slug: str, created_by_id) -> str:
    """Devuelve un mensaje de una línea para el resumen final — nunca
    tira una excepción hacia main(), así un torneo con problemas no
    frena a los demás de la lista."""
    external_url = f"https://www.start.gg/tournament/{slug}/events"

    try:
        data = fetch_tournament(slug)
    except StartGGError as e:
        return f"  ✗ {slug}: {e}"

    if data is None:
        return f"  ✗ {slug}: no encontrado en start.gg"
    if data["start_at"] is None:
        return f"  ✗ {slug}: start.gg no devolvió fecha (startAt vacío)"

    event = db.query(Event).filter(Event.external_url == external_url).first()
    is_new = event is None
    if is_new:
        event = Event(
            external_url=external_url,
            created_by=created_by_id,
            visibility="publico",
        )
        db.add(event)

    event.title = data["name"]
    event.type = "torneo"
    event.start_at = data["start_at"]
    event.attendee_count = data["attendee_count"]
    event.standings = data["standings"]
    db.commit()

    verb = "creado" if is_new else "actualizado"
    fecha = data["start_at"].strftime("%d-%m-%Y")
    participantes = (
        f", {data['attendee_count']} participantes"
        if data["attendee_count"] is not None
        else ""
    )
    return f'  ✓ {slug}: {verb} — "{data["name"]}" ({fecha}{participantes})'


def main() -> None:
    db = SessionLocal()

    creator = (
        db.query(User)
        .filter(func.lower(User.twitch_username) == CREATED_BY_USERNAME.lower())
        .first()
    )
    if creator is None:
        print(
            f"✗ No se encontró el usuario '{CREATED_BY_USERNAME}' en la "
            "base — tiene que haber iniciado sesión al menos una vez."
        )
        db.close()
        return

    for slug in TOURNAMENT_SLUGS:
        print(sync_tournament(db, slug, creator.id))

    db.close()


if __name__ == "__main__":
    main()
