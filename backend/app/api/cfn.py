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
    CardBackgroundUpdate,
    CFNMatchRead,
    CFNMatchStats,
    CFNPlayerRead,
    CFNRegistrationCreate,
    CFNRegistrationDecision,
    CFNRegistrationPending,
    CFNRegistrationRead,
    EncounterRead,
    LinkAccountRequest,
    MyProfileUpdate,
    SkillAxis,
    UnlinkedCandidate,
    UnlinkedRegistration,
)

router = APIRouter(prefix="/cfn", tags=["cfn"])

# categorías de "Records" reusadas como ejes del radar de habilidades en
# /perfil — mismas 5 columnas de CFNProfile que ya alimentan los
# leaderboards de /jugadores (ver RECORD_CATEGORIES en el frontend),
# pero acá con labels cortos pensados para caber en un eje de radar, no
# para un título de leaderboard tipo "El que más Drive Impact se come"
SKILL_CATEGORIES: list[tuple[str, str]] = [
    ("drive_impact_received", "Drive Impact recibido"),
    ("drive_parry_perfect", "Perfect Parry"),
    ("drive_impact_punish_landed", "Punish con DI"),
    ("corner_time_opponent", "Tiempo en esquina"),
    ("throws_landed", "Throws"),
]


def _build_player_read(
    reg: CFNRegistration, profile: CFNProfile | None, user: User | None
) -> CFNPlayerRead:
    """Arma un CFNPlayerRead a partir de las filas relacionadas — usado
    por list_cfn_players (roster completo) y get_cfn_player (un
    jugador puntual, para /jugadores/{cfn_id}), así que la
    construcción vive en un solo lugar en vez de duplicarse."""
    return CFNPlayerRead(
        cfn_id=reg.cfn_id,
        display_name=reg.display_name,
        is_tdf=reg.is_tdf,
        liquipedia_url=reg.liquipedia_url,
        avatar_url=reg.avatar_override or (user.avatar_url if user else None),
        bio=reg.bio,
        banner_url=reg.banner_url,
        social_links=reg.social_links or [],
        card_background_url=reg.card_background_url,
        card_background_brightness=reg.card_background_brightness,
        league_rank=profile.league_rank if profile else None,
        league_points=profile.league_points if profile else None,
        master_rating=profile.master_rating if profile else None,
        character_name=profile.character_name if profile else None,
        drive_impact_received=profile.drive_impact_received if profile else None,
        drive_parry_perfect=profile.drive_parry_perfect if profile else None,
        drive_impact_punish_landed=(
            profile.drive_impact_punish_landed if profile else None
        ),
        corner_time_opponent=profile.corner_time_opponent if profile else None,
        throws_landed=profile.throws_landed if profile else None,
        updated_at=profile.updated_at if profile else None,
        last_error=profile.last_error if profile else None,
    )


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
    return [_build_player_read(reg, profile, user) for reg, profile, user in rows]


@router.get("/players/{cfn_id}", response_model=CFNPlayerRead)
def get_cfn_player(
    cfn_id: str, db: Annotated[Session, Depends(get_db)]
) -> CFNPlayerRead:
    """Un jugador puntual — mismos datos que list_cfn_players pero sin
    traer el roster completo. Alimenta el perfil público de un jugador
    en /jugadores/{cfn_id} (pedido de Seba, 29-08-2026: poder ver el
    perfil de otros, no solo el propio en /perfil). Público, sin auth,
    404 si no existe o no está aprobado — mismo criterio que el resto
    de endpoints públicos de este archivo."""
    row = (
        db.query(CFNRegistration, CFNProfile, User)
        .filter(CFNRegistration.status == "approved", CFNRegistration.cfn_id == cfn_id)
        .outerjoin(CFNProfile, CFNProfile.cfn_id == CFNRegistration.cfn_id)
        .outerjoin(User, User.id == CFNRegistration.user_id)
        .first()
    )
    if row is None:
        raise HTTPException(404, "Jugador no encontrado")
    reg, profile, user = row
    return _build_player_read(reg, profile, user)


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


@router.get("/players/{cfn_id}/skills", response_model=list[SkillAxis])
def get_player_skills(
    cfn_id: str, db: Annotated[Session, Depends(get_db)]
) -> list[SkillAxis]:
    """Radar de habilidades para /perfil — público, sin auth. Escala
    RELATIVA acordada con Seba (28-08-2026): el valor más alto entre
    TODO el roster aprobado con perfil en cada categoría = 100, el
    resto se escala proporcional contra ese máximo. A propósito NO usa
    el piso de 20 partidas de /jugadores (MIN_MATCHES_FOR_RECORDS,
    frontend) — ese piso es para decidir quién puede "ganar" un
    leaderboard público, acá es el propio jugador viendo su radar
    personal, tiene sentido mostrarle su número real aunque tenga pocas
    partidas trackeadas todavía."""
    _get_approved_registration(db, cfn_id)  # 404 si no existe/no aprobado
    profile = db.query(CFNProfile).filter(CFNProfile.cfn_id == cfn_id).first()

    all_profiles = (
        db.query(CFNProfile)
        .join(CFNRegistration, CFNRegistration.cfn_id == CFNProfile.cfn_id)
        .filter(CFNRegistration.status == "approved")
        .all()
    )

    axes = []
    for key, label in SKILL_CATEGORIES:
        value = getattr(profile, key) if profile else None
        max_value = (
            max((getattr(p, key) or 0) for p in all_profiles) if all_profiles else 0
        )
        score = (
            round(min(value / max_value, 1.0) * 100)
            if value is not None and max_value > 0
            else None
        )
        axes.append(SkillAxis(key=key, label=label, value=value, score=score))
    return axes


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
        raise HTTPException(400, f"Ya tienes una solicitud {estado}")

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


@router.patch("/register/me/background", response_model=CFNRegistrationRead)
def update_my_card_background(
    payload: CardBackgroundUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> CFNRegistration:
    """La propia persona sube o cambia la foto de fondo de SU card,
    cuando quiera — no solo al momento de registrarse (a diferencia de
    avatar_override, que hoy solo se pone en POST /register). Requiere
    tener una solicitud ya aprobada: no tiene sentido personalizar la
    card de un registro que ni siquiera es público todavía."""
    registration = (
        db.query(CFNRegistration).filter(CFNRegistration.user_id == user.id).first()
    )
    if registration is None or registration.status != "approved":
        raise HTTPException(
            403, "Necesitas tener tu registro aprobado para personalizar tu card"
        )
    registration.card_background_url = payload.card_background_url
    registration.card_background_brightness = payload.card_background_brightness
    db.commit()
    db.refresh(registration)
    return registration


@router.patch("/register/me/profile", response_model=CFNRegistrationRead)
def update_my_profile(
    payload: MyProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> CFNRegistration:
    """La propia persona edita su bio, avatar, banner y/o su
    display_name desde /perfil, cuando quiera — mismo guard que
    update_my_card_background (registro ya aprobado, si no no hay card
    pública todavía que editar). Solo toca los campos que vinieron en
    el body (exclude_unset) — así mandar solo bio no pisa el avatar con
    None por accidente, y viceversa.

    display_name es el único campo acá que NUNCA puede quedar vacío
    (columna NOT NULL, se usa como identificador en toda la UI) — sin
    aprobación de staff de por medio a propósito (decisión de Seba,
    29-08-2026: mismo criterio libre que bio/avatar, sin duplicados ni
    filtro de contenido — si en algún momento se pide más control, se
    agrega ahí, no antes)."""
    registration = (
        db.query(CFNRegistration).filter(CFNRegistration.user_id == user.id).first()
    )
    if registration is None or registration.status != "approved":
        raise HTTPException(
            403, "Necesitas tener tu registro aprobado para editar tu perfil"
        )
    updates = payload.model_dump(exclude_unset=True)
    if "display_name" in updates:
        name = (updates["display_name"] or "").strip()
        if not name:
            raise HTTPException(422, "El nombre no puede quedar vacío")
        updates["display_name"] = name
    for field, value in updates.items():
        setattr(registration, field, value)
    db.commit()
    db.refresh(registration)
    return registration


def _get_approved_registration(db: Session, cfn_id: str) -> CFNRegistration:
    registration = (
        db.query(CFNRegistration)
        .filter(CFNRegistration.cfn_id == cfn_id, CFNRegistration.status == "approved")
        .first()
    )
    if registration is None:
        raise HTTPException(404, "Jugador no encontrado")
    return registration


@router.post("/players/{cfn_id}/background", response_model=CFNRegistrationRead)
def set_player_card_background(
    cfn_id: str,
    payload: CardBackgroundUpdate,
    db: Annotated[Session, Depends(get_db)],
    _staff: Annotated[User, Depends(require_staff)],
) -> CFNRegistration:
    """Moderación — solo staff. Sube o reemplaza la foto de fondo de
    CUALQUIER jugador del roster, tenga o no una puesta ya (mismo
    endpoint sirve para "subir" y para "reemplazar", la diferencia es
    solo si card_background_url ya tenía algo antes)."""
    registration = _get_approved_registration(db, cfn_id)
    registration.card_background_url = payload.card_background_url
    registration.card_background_brightness = payload.card_background_brightness
    db.commit()
    db.refresh(registration)
    return registration


@router.delete("/players/{cfn_id}/background", status_code=204)
def remove_player_card_background(
    cfn_id: str,
    db: Annotated[Session, Depends(get_db)],
    _staff: Annotated[User, Depends(require_staff)],
) -> None:
    """Moderación — solo staff. Saca la foto de fondo de un jugador
    (vuelve al estado por default), sin necesitar que la propia persona
    haga nada — para cuando hay que moderar algo indebido ya mismo."""
    registration = _get_approved_registration(db, cfn_id)
    registration.card_background_url = None
    registration.card_background_brightness = None
    db.commit()


@router.get("/registrations/unlinked", response_model=list[UnlinkedRegistration])
def list_unlinked_registrations(
    db: Annotated[Session, Depends(get_db)],
    _staff: Annotated[User, Depends(require_staff)],
) -> list[UnlinkedRegistration]:
    """Roster viejo (migrado antes del auto-registro) sin ninguna cuenta
    de Twitch asociada — por eso no tiene avatar real ni puede
    autogestionar su foto de fondo. Solo staff. Sugiere una cuenta SOLO
    si el nombre de usuario de Twitch coincide exacto (sin distinguir
    mayúsculas) — nunca una sugerencia "parecida", ver UnlinkedCandidate
    para el motivo (vincular mal le da a alguien permiso sobre la card
    de otra persona)."""
    unlinked = (
        db.query(CFNRegistration)
        .filter(
            CFNRegistration.status == "approved",
            CFNRegistration.user_id.is_(None),
        )
        .order_by(CFNRegistration.display_name)
        .all()
    )

    result = []
    for reg in unlinked:
        candidate_user = (
            db.query(User).filter(User.twitch_username.ilike(reg.display_name)).first()
        )
        candidate = (
            UnlinkedCandidate(
                user_id=str(candidate_user.id),
                twitch_username=candidate_user.twitch_username,
                display_name=candidate_user.display_name,
                avatar_url=candidate_user.avatar_url,
            )
            if candidate_user
            else None
        )
        result.append(
            UnlinkedRegistration(
                cfn_id=reg.cfn_id, display_name=reg.display_name, candidate=candidate
            )
        )
    return result


@router.post("/registrations/{cfn_id}/link-account", response_model=CFNRegistrationRead)
def link_account(
    cfn_id: str,
    payload: LinkAccountRequest,
    db: Annotated[Session, Depends(get_db)],
    _staff: Annotated[User, Depends(require_staff)],
) -> CFNRegistration:
    """Vincula una cuenta de Twitch a una fila del roster viejo — solo
    staff, siempre a mano (nunca automático, ver list_unlinked_registrations).
    Una vez vinculada, el avatar de Twitch aparece solo (misma lógica de
    siempre en GET /cfn/players) y esa cuenta puede autogestionar su
    propia foto de fondo desde ahí en adelante."""
    registration = _get_approved_registration(db, cfn_id)
    if registration.user_id is not None:
        raise HTTPException(400, "Este jugador ya tiene una cuenta vinculada")

    try:
        target_user_id = uuid.UUID(payload.user_id)
    except ValueError:
        raise HTTPException(404, "Cuenta no encontrada") from None

    target_user = db.get(User, target_user_id)
    if target_user is None:
        raise HTTPException(404, "Cuenta no encontrada")

    already_linked = (
        db.query(CFNRegistration)
        .filter(CFNRegistration.user_id == target_user_id)
        .first()
    )
    if already_linked is not None:
        raise HTTPException(
            400, "Esa cuenta ya está vinculada a otro jugador del roster"
        )

    registration.user_id = target_user_id
    db.commit()
    db.refresh(registration)
    return registration
