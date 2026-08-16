from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CFNMatch, CFNProfile
from app.schemas.cfn import CFNMatchRead, CFNMatchStats, CFNProfileRead

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
    total_decided = wins + losses  # excluye partidas con won=None (no se pudo determinar)
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
