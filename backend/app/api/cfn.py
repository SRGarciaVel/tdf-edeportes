import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated, require_staff
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import CFNMatch, CFNProfile, CFNRegistration, User
from app.schemas.cfn import (
    CFNMatchRead,
    CFNMatchStats,
    CFNPlayerRead,
    CFNRegistrationCreate,
    CFNRegistrationDecision,
    CFNRegistrationPending,
    CFNRegistrationRead,
    EncounterRead,
)

router = APIRouter(prefix="/cfn", tags=["cfn"])


@router.get("/players", response_model=list[CFNPlayerRead])
def list_cfn_players(db: Annotated[Session, Depends(get_db)]) -> list[CFNPlayerRead]:
    """Público, sin auth. El roster = filas de cfn_registrations con
    status="approved" (ver ese modelo) — nunca dispara un scrape en
    vivo, solo lee el cache que llena scripts/refresh_cfn.py (SPECS.md
    #12). LEFT JOIN a cfn_profiles porque alguien recién aprobado puede
    no tener fila ahí todavía (el cron corre cada hora, no al toque)."""
    rows = (
        db.query(CFNRegistration, CFNProfile, User)
        .filter(CFNRegistration.status == "approved")
        .outerjoin(CFNProfile, CFNProfile.cfn_id == CFNRegistration.cfn_id)
        .outerjoin(User, User.id == CFNRegistration.user_id)
        .all()
    )
    return [
        CFNPlayerRead(
            cfn_id=reg.cfn_id,
            display_name=reg.display_name,
            is_tdf=reg.is_tdf,
            liquipedia_url=reg.liquipedia_url,
            avatar_url=reg.avatar_override or (user.avatar_url if user else None),
            league_rank=profile.league_rank if profile else None,
            league_points=profile.league_points if profile else None,
            master_rating=profile.master_rating if profile else None,
            character_name=profile.character_name if profile else None,
            updated_at=profile.updated_at if profile else None,
            last_error=profile.last_error if profile else None,
        )
        for reg, profile, user in rows
    ]


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

    # cfn_registrations, no cfn_profiles — es la fuente de verdad real del
    # nombre (ver GET /cfn/players, mismo criterio). cfn_profiles es un
    # cache que solo se actualiza cuando corre el cron cada hora: si
    # alguien le cambia el nombre a su registro, este endpoint mostraría
    # el nombre viejo hasta la próxima corrida si leyera de ahí en vez de
    # acá — pasó de verdad con "BF" -> "BazthyFreeman" (19-08-2026).
    names = {
        reg.cfn_id: reg.display_name
        for reg in db.query(CFNRegistration)
        .filter(CFNRegistration.status == "approved")
        .all()
    }
    tracked_ids = set(names.keys())

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
                player_a_name=names.get(m.cfn_id, m.cfn_id),
                player_b_cfn_id=m.opponent_cfn_id,
                player_b_name=names[m.opponent_cfn_id],
                played_at=m.played_at,
            )
        )

    encounters.sort(key=lambda e: e.played_at, reverse=True)
    return encounters


@router.post("/register", response_model=CFNRegistrationRead, status_code=201)
@limiter.limit("5/hour")
def register_cfn(
    request: Request,
    payload: CFNRegistrationCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> CFNRegistration:
    """Auto-registro — requiere login (necesitamos poder identificar de
    quién es el pedido, y mostrarle a staff la cuenta real de Twitch
    detrás). Queda status="pending" hasta que staff lo apruebe (ver
    approve_registration) — no aparece en /jugadores hasta entonces,
    list_cfn_players solo lee filas "approved"."""
    existing_own = (
        db.query(CFNRegistration).filter(CFNRegistration.user_id == user.id).first()
    )
    if existing_own is not None and existing_own.status in ("pending", "approved"):
        estado = "pendiente" if existing_own.status == "pending" else "aprobada"
        raise HTTPException(400, f"Ya tenés una solicitud {estado}")

    # ¿el CFN ID pedido ya pertenece a otra fila, de otra persona? — evita
    # que dos cuentas terminen "dueñas" del mismo CFN ID
    cfn_owner = (
        db.query(CFNRegistration)
        .filter(CFNRegistration.cfn_id == payload.cfn_id)
        .first()
    )
    if cfn_owner is not None and cfn_owner.user_id != user.id:
        raise HTTPException(400, "Ese CFN ID ya está registrado")

    if existing_own is not None:
        # existía pero estaba rechazada — se reintenta reescribiendo la
        # misma fila en vez de acumular una nueva por cada intento
        existing_own.cfn_id = payload.cfn_id
        existing_own.display_name = user.display_name
        existing_own.avatar_override = payload.avatar_override
        existing_own.status = "pending"
        existing_own.requested_at = datetime.now(timezone.utc)
        existing_own.reviewed_at = None
        existing_own.reviewed_by = None
        db.commit()
        db.refresh(existing_own)
        return existing_own

    registration = CFNRegistration(
        cfn_id=payload.cfn_id,
        display_name=user.display_name,
        user_id=user.id,
        avatar_override=payload.avatar_override,
        status="pending",
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


@router.get("/register/me", response_model=CFNRegistrationRead | None)
def get_my_registration(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> CFNRegistration | None:
    """Para que el frontend sepa qué mostrar: nada si nunca pidió nada
    (se ve el formulario), pendiente/rechazada si corresponde, o
    tampoco nada si ya está aprobada (en ese caso ya aparece directo en
    /jugadores, no hace falta un estado especial acá)."""
    return db.query(CFNRegistration).filter(CFNRegistration.user_id == user.id).first()


@router.get("/registrations/pending", response_model=list[CFNRegistrationPending])
def list_pending_registrations(
    db: Annotated[Session, Depends(get_db)],
    _staff: Annotated[User, Depends(require_staff)],
) -> list[dict]:
    """Panel de moderación — solo staff. Incluye la cuenta de Twitch real
    detrás de cada pedido (nombre, avatar), para que quien apruebe
    reconozca a la persona, no solo el nombre que escribió a mano."""
    rows = (
        db.query(CFNRegistration, User)
        .join(User, User.id == CFNRegistration.user_id)
        .filter(CFNRegistration.status == "pending")
        .order_by(CFNRegistration.requested_at.asc())
        .all()
    )
    return [
        {
            "id": reg.id,
            "cfn_id": reg.cfn_id,
            "display_name": reg.display_name,
            "requested_at": reg.requested_at,
            "twitch_username": u.twitch_username,
            "twitch_display_name": u.display_name,
            "twitch_avatar_url": u.avatar_url,
        }
        for reg, u in rows
    ]


def _get_pending_registration(db: Session, registration_id: str) -> CFNRegistration:
    try:
        reg_uuid = uuid.UUID(registration_id)
    except ValueError:
        raise HTTPException(404, "Solicitud no encontrada") from None

    registration = db.get(CFNRegistration, reg_uuid)
    if registration is None:
        raise HTTPException(404, "Solicitud no encontrada")
    if registration.status != "pending":
        raise HTTPException(400, "Esta solicitud ya fue revisada")
    return registration


@router.post(
    "/registrations/{registration_id}/approve", response_model=CFNRegistrationRead
)
def approve_registration(
    registration_id: str,
    payload: CFNRegistrationDecision,
    db: Annotated[Session, Depends(get_db)],
    staff: Annotated[User, Depends(require_staff)],
) -> CFNRegistration:
    """Deja que staff ajuste el nombre final, la etiqueta TDF y el link
    de Liquipedia antes de publicar, en vez de aceptar ciegamente lo que
    la persona escribió al pedirlo — is_tdf en particular NUNCA se
    deriva solo, lo decide staff caso a caso (ver CFNRegistration)."""
    registration = _get_pending_registration(db, registration_id)
    if payload.display_name:
        registration.display_name = payload.display_name
    registration.is_tdf = payload.is_tdf
    registration.liquipedia_url = payload.liquipedia_url
    registration.status = "approved"
    registration.reviewed_at = datetime.now(timezone.utc)
    registration.reviewed_by = staff.id
    db.commit()
    db.refresh(registration)
    return registration


@router.post(
    "/registrations/{registration_id}/reject", response_model=CFNRegistrationRead
)
def reject_registration(
    registration_id: str,
    db: Annotated[Session, Depends(get_db)],
    staff: Annotated[User, Depends(require_staff)],
) -> CFNRegistration:
    registration = _get_pending_registration(db, registration_id)
    registration.status = "rejected"
    registration.reviewed_at = datetime.now(timezone.utc)
    registration.reviewed_by = staff.id
    db.commit()
    db.refresh(registration)
    return registration
