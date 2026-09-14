"""Cliente de la API pública de start.gg (GraphQL) — a diferencia de
cfn_scraper.py, esto NO usa Playwright ni sesión de navegador: es la
API oficial y documentada de start.gg (developer.start.gg), con
autenticación por token Bearer normal. Investigado y confirmado
viable por Seba, 13-09-2026 — límite real de 80 requests/60s, muy por
encima de lo que este proyecto necesita (unos pocos torneos, no un
tracker en vivo).
"""

import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

API_URL = "https://api.start.gg/gql/alpha"

# trae nombre, fecha, cantidad de participantes, y el podio (top 3)
# del PRIMER evento/bracket del torneo, por su slug. Un torneo puede
# tener más de un evento (ej. bracket de SF6 y de Third Strike por
# separado) — esto solo refleja el primero que devuelve la API en
# orden natural, no los combina ni deja elegir cuál. Suficiente para
# los torneos de TDF hasta ahora (un solo juego por torneo,
# confirmado 13-09-2026); si el club llega a organizar un torneo
# multi-juego, esto habría que revisarlo.
#
# startAt viene en Unix timestamp (segundos), no ISO — confirmado
# contra la respuesta real la primera vez que se corrió el script,
# 13-09-2026. participants.pageInfo.total y events[].standings
# confirmados contra developer.start.gg/docs/examples/queries/
# attendee-counts y .../event-standings respectivamente.
QUERY = """
query TournamentBySlug($slug: String!) {
  tournament(slug: $slug) {
    name
    startAt
    participants(query: {}) {
      pageInfo {
        total
      }
    }
    events {
      standings(query: { perPage: 3 }) {
        nodes {
          placement
          entrant {
            name
          }
        }
      }
    }
  }
}
"""


class StartGGError(Exception):
    """Token faltante, torneo no encontrado, o algo real de red — el
    script que llama a esto decide si sigue con el resto de la lista
    o corta ahí (ver sync_startgg_tournaments.py)."""


def fetch_tournament(slug: str) -> dict | None:
    """Trae {name, start_at, attendee_count, standings} de un torneo
    por su slug. `start_at` ya viene convertido a datetime con
    timezone (UTC) — no el timestamp crudo de start.gg. `standings`
    es una lista de hasta 3 dicts {"placement": int, "gamertag": str}
    del primer evento del torneo (ver comentario en QUERY sobre por
    qué solo el primero), o lista vacía si ese evento no tiene
    standings todavía. None si el torneo no existe (no debería pasar
    con slugs reales, pero por las dudas no explota). Levanta
    StartGGError si no hay token configurado o la request en sí
    falla (red, 401, etc.) — eso sí es un problema real, no "no hay
    datos todavía" como en sf6_meta.py."""
    if not settings.startgg_api_token:
        raise StartGGError(
            "STARTGG_API_TOKEN no está configurado — generá uno en "
            "start.gg/admin/profile/developer y agrégalo al .env"
        )

    try:
        response = httpx.post(
            API_URL,
            json={"query": QUERY, "variables": {"slug": slug}},
            headers={
                "Authorization": f"Bearer {settings.startgg_api_token}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        response.raise_for_status()
    except httpx.HTTPError as e:
        raise StartGGError(f"Error de red consultando start.gg: {e}") from e

    payload = response.json()
    if "errors" in payload:
        raise StartGGError(f"start.gg devolvió error: {payload['errors']}")

    tournament = payload.get("data", {}).get("tournament")
    if tournament is None:
        logger.warning("Torneo no encontrado en start.gg: slug=%s", slug)
        return None

    start_at_ts = tournament.get("startAt")

    events = tournament.get("events") or []
    standings_nodes = (
        (events[0].get("standings") or {}).get("nodes") or [] if events else []
    )
    standings = [
        {
            "placement": node["placement"],
            "gamertag": node["entrant"]["name"],
        }
        for node in standings_nodes
        # placement o entrant en null pasa en standings de partidas
        # todavía sin terminar del todo — se descarta esa fila en vez
        # de guardar un podio con huecos
        if node.get("placement") is not None and node.get("entrant") is not None
    ]

    return {
        "name": tournament["name"],
        "start_at": (
            datetime.fromtimestamp(start_at_ts, tz=timezone.utc)
            if start_at_ts is not None
            else None
        ),
        "attendee_count": (
            (tournament.get("participants") or {}).get("pageInfo") or {}
        ).get("total"),
        "standings": standings,
    }
