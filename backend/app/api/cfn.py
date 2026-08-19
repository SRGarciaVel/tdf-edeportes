from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CFNMatch, CFNProfile
from app.schemas.cfn import CFNMatchRead, CFNMatchStats, CFNProfileRead, EncounterRead

router = APIRouter(prefix="/cfn", tags=["cfn"])


@router.get("/players", response_model=list[CFNProfileRead])
def list_cfn_players(db: Annotated[Session, Depends(get_db)]) -> list[CFNProfile]:
    """Público, sin auth. Lee el cache que llena scripts/refresh_cfn.py —
    nunca dispara un scrape en vivo (SPECS.md #12)."""
    return db.query(CFNProfile).all()


@router.get("/players/{cfn_id}/matches", response_model=CFNMatchStats)
def get_match_stats(
    cfn_id: str,
    db: Annotated[Session, Depends(get_db)],
    days: Annotated[int, Query(ge=1, le=30)] = 3,
) -> CFNMatchStats:
    """Win rate y personajes usados en los últimos `days` días. Público,
    sin auth — mismo criterio que /players. Agrega en el backend en vez de
    mandar cada partida al frontend, para no tener que mandar cada vez más
    datos a medida que el historial crece con las semanas."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    matches = (
        db.query(CFNMatch)
        .filter(CFNMatch.cfn_id == cfn_id, CFNMatch.played_at >= cutoff)
        .all()
    )

    wins = sum(1 for m in matches if m.won is True)
    losses = sum(1 for m in matches if m.won is False)
    total_decided = (
        wins + losses
    )  # excluye partidas con won=None (no se pudo determinar)
    win_rate = wins / total_decided if total_decided > 0 else None

    character_counts = Counter(m.character_name for m in matches if m.character_name)

    return CFNMatchStats(
        cfn_id=cfn_id,
        days=days,
        total_matches=len(matches),
        wins=wins,
        losses=losses,
        win_rate=win_rate,
        characters=dict(character_counts.most_common()),
    )


@router.get("/players/{cfn_id}/matches/recent", response_model=list[CFNMatchRead])
def get_recent_matches(
    cfn_id: str,
    db: Annotated[Session, Depends(get_db)],
    days: Annotated[int, Query(ge=1, le=30)] = 3,
    limit: Annotated[int, Query(ge=1, le=50)] = 30,
) -> list[CFNMatch]:
    """Partidas individuales (no agregadas) en los últimos `days` días, más
    recientes primero — para cuando el resumen de /matches no alcanza y
    hace falta ver el detalle real de cada partida (SPECS.md — el
    problema que resolvió esto: un resumen tipo "Zangief x23, Akuma x14..."
    no dice cuándo pasó cada cosa). Público, sin auth."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return (
        db.query(CFNMatch)
        .filter(CFNMatch.cfn_id == cfn_id, CFNMatch.played_at >= cutoff)
        .order_by(CFNMatch.played_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/encounters/recent", response_model=list[EncounterRead])
def get_recent_encounters(
    db: Annotated[Session, Depends(get_db)],
) -> list[EncounterRead]:
    """Cruces entre dos jugadores trackeados por TDF en las últimas 48
    horas — no cualquier partida, solo cuando el rival TAMBIÉN es alguien
    que seguimos (opponent_cfn_id se resuelve en cfn_scraper.py). Cada
    cruce así queda en cfn_matches dos veces (una por jugador, cada uno
    con el otro como "opponent"), así que acá se dedupea por par sin
    importar el orden antes de devolver — evita mostrar el mismo cruce
    dos veces. Público, sin auth, mismo criterio que el resto de /cfn.

    48hs, no 24 — con ~9 personas trackeadas los cruces reales son raros
    (en la corrida real del 19-08-2026, de 80 partidas solo 1 fue un
    cruce genuino), así que una ventana de 24hs deja el aviso vacío la
    mayoría del tiempo. Cada cruce ya muestra hace cuánto pasó, así que
    ampliar la ventana no lo hace sentir menos "reciente"."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    rows = (
        db.query(CFNMatch)
        .filter(CFNMatch.opponent_cfn_id.isnot(None), CFNMatch.played_at >= cutoff)
        .all()
    )

    profiles = {
        p.cfn_id: p.display_name or p.cfn_id for p in db.query(CFNProfile).all()
    }
    tracked_ids = set(profiles.keys())

    seen: set[tuple[str, str, datetime]] = set()
    encounters: list[EncounterRead] = []
    for m in rows:
        if m.opponent_cfn_id not in tracked_ids:
            continue
        pair_key = (
            min(m.cfn_id, m.opponent_cfn_id),
            max(m.cfn_id, m.opponent_cfn_id),
            m.played_at,
        )
        if pair_key in seen:
            continue
        seen.add(pair_key)
        encounters.append(
            EncounterRead(
                player_a_cfn_id=m.cfn_id,
                player_a_name=profiles.get(m.cfn_id, m.cfn_id),
                player_b_cfn_id=m.opponent_cfn_id,
                player_b_name=profiles[m.opponent_cfn_id],
                played_at=m.played_at,
            )
        )

    encounters.sort(key=lambda e: e.played_at, reverse=True)
    return encounters
