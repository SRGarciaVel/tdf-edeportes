import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_authenticated
from app.core.database import get_db
from app.models import TierList, TierListTemplate, User
from app.schemas.tier_list import (
    TierItem,
    TierListCreate,
    TierListRead,
    TierListTemplateCreate,
    TierListTemplateRead,
    TierListTemplateSummary,
)

router = APIRouter(tags=["tierlists"])

# mismo roster que frontend/src/lib/characterColors.ts — mantener
# sincronizados a mano si se agrega/saca un personaje.
SF6_ROSTER = {
    "A.K.I.", "Akuma", "Alex", "Blanka", "C. Viper", "Cammy", "Chun-Li",
    "Dee Jay", "Dhalsim", "Ed", "E. Honda", "Elena", "Guile", "Ingrid",
    "Jamie", "JP", "Juri", "Ken", "Kimberly", "Lily", "Luke", "M. Bison",
    "Mai", "Manon", "Marisa", "Rashid", "Ryu", "Sagat", "Terry", "Yasmine",
    "Zangief",
}
THIRD_STRIKE_ROSTER = {
    "Alex", "Chun-Li", "Dudley", "Elena", "Gill", "Hugo", "Ibuki", "Ken",
    "Makoto", "Necro", "Oro", "Q", "Remy", "Ryu", "Sean", "Twelve", "Urien",
    "Yang", "Yun", "Akuma",
}
ROSTERS = {"sf6": SF6_ROSTER, "3s": THIRD_STRIKE_ROSTER}

MAX_TIERS = 12
MAX_PER_TIER = 60
MAX_IMAGE_DATA_URL_LEN = 200_000  # ~150KB en base64, generoso para 120x120
IMAGE_DATA_URL_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp);base64,")


def _validate_items(game: str, tier_name: str, items: list[TierItem]) -> None:
    if len(items) > MAX_PER_TIER:
        raise HTTPException(400, f"Demasiados ítems en el tier '{tier_name}'")

    if game == "custom":
        for item in items:
            if item.image is None:
                raise HTTPException(400, "Los ítems de una tier list personalizada necesitan imagen")
            if len(item.image) > MAX_IMAGE_DATA_URL_LEN:
                raise HTTPException(400, "Una imagen es demasiado pesada")
            if not IMAGE_DATA_URL_RE.match(item.image):
                raise HTTPException(400, "Formato de imagen inválido")
    else:
        roster = ROSTERS[game]
        for item in items:
            if item.image is not None:
                raise HTTPException(400, "Este juego no admite imágenes propias")
            if item.label not in roster:
                raise HTTPException(400, f"'{item.label}' no es un personaje válido de {game}")


@router.post("/tierlists", response_model=TierListRead, status_code=201)
def create_tier_list(
    payload: TierListCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user)],
) -> TierList:
    """SF6/Third Strike: público, sin auth (mismo criterio que TierMaker).
    Personalizada (con imagen): requiere login — se chequea acá adentro,
    no como dependency fija, porque esta misma ruta sirve a los tres
    juegos y los otros dos tienen que seguir siendo anónimos."""
    if payload.game == "custom" and user is None:
        raise HTTPException(401, "Iniciá sesión para guardar una tier list personalizada")

    if len(payload.tiers) > MAX_TIERS:
        raise HTTPException(400, f"Máximo {MAX_TIERS} tiers")

    for tier_name, items in payload.tiers.items():
        _validate_items(payload.game, tier_name, items)

    tier_list = TierList(
        game=payload.game,
        tiers={k: [i.model_dump() for i in v] for k, v in payload.tiers.items()},
    )
    db.add(tier_list)
    db.commit()
    db.refresh(tier_list)
    return tier_list


@router.get("/tierlists/{tier_list_id}", response_model=TierListRead)
def get_tier_list(tier_list_id: str, db: Annotated[Session, Depends(get_db)]) -> TierList:
    tier_list = db.query(TierList).filter(TierList.id == tier_list_id).first()
    if tier_list is None:
        raise HTTPException(404, "Tier list no encontrada")
    return tier_list


@router.post("/tierlist-templates", response_model=TierListTemplateRead, status_code=201)
def create_template(
    payload: TierListTemplateCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> TierListTemplate:
    """Requiere login — son las imágenes propias de la persona."""
    if len(payload.items) > MAX_PER_TIER:
        raise HTTPException(400, "Demasiados ítems en la plantilla")
    for item in payload.items:
        if item.image is None or not IMAGE_DATA_URL_RE.match(item.image):
            raise HTTPException(400, f"Imagen inválida en '{item.label}'")
        if len(item.image) > MAX_IMAGE_DATA_URL_LEN:
            raise HTTPException(400, f"La imagen de '{item.label}' es demasiado pesada")

    template = TierListTemplate(
        name=payload.name,
        created_by=user.id,
        items=[i.model_dump() for i in payload.items],
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/tierlist-templates/mine", response_model=list[TierListTemplateSummary])
def list_my_templates(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> list[dict]:
    templates = (
        db.query(TierListTemplate)
        .filter(TierListTemplate.created_by == user.id)
        .order_by(TierListTemplate.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "name": t.name,
            "item_count": len(t.items),
            "created_at": t.created_at,
        }
        for t in templates
    ]


@router.get("/tierlist-templates/{template_id}", response_model=TierListTemplateRead)
def get_template(
    template_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> TierListTemplate:
    """Solo el dueño puede cargar el detalle completo (trae las imágenes) —
    son subidas propias, no públicas como las tier lists de personajes."""
    try:
        template_uuid = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(404, "Plantilla no encontrada") from None

    template = db.get(TierListTemplate, template_uuid)
    if template is None or template.created_by != user.id:
        raise HTTPException(404, "Plantilla no encontrada")
    return template
