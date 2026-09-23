from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import SFPersonalityResult, User
from app.schemas.sf_personality import (
    CharacterStat,
    Question,
    QuestionsResponse,
    ResolveCharacterRequest,
    ResolveCharacterResponse,
    ResolveEraRequest,
    ResolveEraResponse,
    ResolveFamilyRequest,
    ResolveFamilyResponse,
    ResolveSubfamilyRequest,
    ResolveSubfamilyResponse,
    StatsResponse,
)
from app.services.sf_personality_data import (
    CHARACTER_TO_FAMILY,
    ERA_QUESTIONS_GENERIC,
    KEN_ERA_QUESTION,
    NIVEL1_5_QUESTION,
    NIVEL1_QUESTIONS,
    NIVEL2_QUESTIONS,
)
from app.services.sf_personality_matching import (
    PersonalityTestError,
    needs_era_question,
    needs_libres_split,
    resolve_character,
    resolve_era,
    resolve_family,
    resolve_libres_subfamily,
)

router = APIRouter(prefix="/sf-personality", tags=["sf-personality"])


def _to_question(pregunta: dict) -> Question:
    return Question(
        texto=pregunta["texto"],
        opciones=[texto for texto, _delta in pregunta["opciones"]],
    )


@router.get("/questions", response_model=QuestionsResponse)
def get_questions() -> QuestionsResponse:
    """Todo el árbol de preguntas de una sola vez — el frontend decide
    localmente cuál tanda de Nivel 2 mostrar según la familia que ya
    resolvió el paso anterior, sin necesitar otro viaje al backend
    solo para pedir las preguntas."""
    return QuestionsResponse(
        nivel1=[_to_question(p) for p in NIVEL1_QUESTIONS],
        nivel1_5=_to_question(NIVEL1_5_QUESTION),
        nivel2_por_familia={
            fam: [_to_question(p) for p in preguntas]
            for fam, preguntas in NIVEL2_QUESTIONS.items()
        },
        era_generica=[_to_question(p) for p in ERA_QUESTIONS_GENERIC],
        era_ken=_to_question(KEN_ERA_QUESTION),
    )


@router.post("/resolve-family", response_model=ResolveFamilyResponse)
def post_resolve_family(payload: ResolveFamilyRequest) -> ResolveFamilyResponse:
    try:
        family = resolve_family(payload.answers)
    except PersonalityTestError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return ResolveFamilyResponse(
        family=family, needs_subfamily_split=needs_libres_split(family)
    )


@router.post("/resolve-subfamily", response_model=ResolveSubfamilyResponse)
def post_resolve_subfamily(
    payload: ResolveSubfamilyRequest,
) -> ResolveSubfamilyResponse:
    try:
        subfamily = resolve_libres_subfamily(payload.answer)
    except PersonalityTestError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return ResolveSubfamilyResponse(subfamily=subfamily)


def _save_result(db: Session, user: User | None, character_name: str) -> None:
    """Guarda el resultado para CUALQUIERA que termine el test
    (cambiado 22-09-2026 -- antes solo se guardaba logueado, ver
    comentario del modelo). Logueado: un usuario, un resultado -- si
    ya tenía uno, se actualiza en vez de duplicar. Invitado (user es
    None): siempre una fila nueva -- no hay identidad estable entre
    visitas anónimas, así que no existe "el resultado anterior de este
    invitado" para actualizar."""
    if user is None:
        db.add(SFPersonalityResult(user_id=None, character_name=character_name))
        db.commit()
        return

    existing = (
        db.query(SFPersonalityResult)
        .filter(SFPersonalityResult.user_id == user.id)
        .first()
    )
    if existing is not None:
        existing.character_name = character_name
    else:
        db.add(SFPersonalityResult(user_id=user.id, character_name=character_name))
    db.commit()


@router.post("/resolve-character", response_model=ResolveCharacterResponse)
@limiter.limit("30/hour")
def post_resolve_character(
    request: Request,
    payload: ResolveCharacterRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user)],
) -> ResolveCharacterResponse:
    try:
        character, neighbors = resolve_character(payload.family_key, payload.answers)
    except (PersonalityTestError, KeyError) as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    needs_era = needs_era_question(character)
    final_result = None
    if not needs_era:
        final_result = character
        # se guarda para cualquiera, logueado o invitado (ver
        # _save_result) -- pedido de Seba, 22-09-2026
        _save_result(db, user, final_result)

    return ResolveCharacterResponse(
        character=character,
        needs_era=needs_era,
        final_result=final_result,
        # todavía no se sabe el vector final si falta resolver la era
        # -- mostrar vecinos acá sería del personaje base, no del
        # resultado real que la persona va a terminar viendo
        neighbors=[] if needs_era else neighbors,
    )


@router.post("/resolve-era", response_model=ResolveEraResponse)
@limiter.limit("30/hour")
def post_resolve_era(
    request: Request,
    payload: ResolveEraRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user)],
) -> ResolveEraResponse:
    try:
        final_result, neighbors = resolve_era(payload.character, payload.answers)
    except (PersonalityTestError, KeyError) as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    # se guarda para cualquiera, logueado o invitado (ver _save_result)
    _save_result(db, user, final_result)

    return ResolveEraResponse(final_result=final_result, neighbors=neighbors)


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Annotated[Session, Depends(get_db)]) -> StatsResponse:
    """Público, sin auth -- para mostrar algo tipo "el 40% de TDF sacó
    Ken" en la página del test. Cuenta a cualquiera que haya terminado
    el test, logueado o no (ver SFPersonalityResult), así que el total
    ya no depende de cuánta gente inicie sesión."""
    rows = (
        db.query(SFPersonalityResult.character_name, func.count().label("count"))
        .group_by(SFPersonalityResult.character_name)
        .order_by(func.count().desc())
        .all()
    )
    total = sum(count for _name, count in rows)
    return StatsResponse(
        total_results=total,
        by_character=[
            CharacterStat(
                character_name=name,
                count=count,
                percentage=round(100 * count / total, 1) if total else 0.0,
                family_key=CHARACTER_TO_FAMILY.get(name),
            )
            for name, count in rows
        ],
    )
