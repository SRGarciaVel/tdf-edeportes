import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_authenticated, require_staff
from app.core.database import get_db
from app.models import TierList, TierListTemplate, User
from app.schemas.tier_list import (
    TierListCreate,
    TierListRead,
    TierListTemplateCreate,
    TierListTemplateRead,
    TierListTemplateSummary,
)

router = APIRouter(tags=["tierlists"])

MAX_TIERS = 12
MAX_ITEMS = 60
MAX_IMAGE_DATA_URL_LEN = 200_000  # ~150KB en base64, generoso para 120x120
IMAGE_DATA_URL_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp);base64,")


@router.get("/tierlist-templates", response_model=list[TierListTemplateSummary])
def list_templates(db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    """Público, sin auth — cualquiera puede ver qué plantillas armó la
    comunidad para elegir una y ranquear, aunque no esté logueado. Solo
    crear una plantilla nueva requiere login (POST más abajo)."""
    templates = (
        db.query(TierListTemplate)
        .options(joinedload(TierListTemplate.creator))
        .order_by(TierListTemplate.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "name": t.name,
            "item_count": len(t.items),
            "creator_name": t.creator.display_name,
            "created_at": t.created_at,
        }
        for t in templates
    ]


@router.get("/tierlist-templates/{template_id}", response_model=TierListTemplateRead)
def get_template(template_id: str, db: Annotated[Session, Depends(get_db)]) -> dict:
    """Público — hace falta poder leer el detalle completo (con imágenes)
    sin estar logueado, para que cualquiera pueda ranquear una plantilla
    de la comunidad sin necesitar cuenta."""
    try:
        template_uuid = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(404, "Plantilla no encontrada") from None

    template = (
        db.query(TierListTemplate)
        .options(joinedload(TierListTemplate.creator))
        .filter(TierListTemplate.id == template_uuid)
        .first()
    )
    if template is None:
        raise HTTPException(404, "Plantilla no encontrada")
    return {
        "id": template.id,
        "name": template.name,
        "items": template.items,
        "creator_name": template.creator.display_name,
        "created_at": template.created_at,
    }


@router.post(
    "/tierlist-templates", response_model=TierListTemplateRead, status_code=201
)
def create_template(
    payload: TierListTemplateCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> dict:
    """Requiere login — son imágenes que sube la persona, quedan
    asociadas a su cuenta (SPECS.md, sección de tier lists: por qué esto
    exige login y el ranking en sí no)."""
    if len(payload.items) > MAX_ITEMS:
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
    return {
        "id": template.id,
        "name": template.name,
        "items": template.items,
        "creator_name": user.display_name,
        "created_at": template.created_at,
    }


@router.delete("/tierlist-templates/{template_id}", status_code=204)
def delete_template(
    template_id: str,
    db: Annotated[Session, Depends(get_db)],
    _staff_user: Annotated[User, Depends(require_staff)],
) -> None:
    """Solo staff — cualquier miembro del staff puede borrar cualquier
    plantilla de la comunidad, no solo quien la creó (SPECS.md §4: sin
    matriz de permisos, la única regla es autenticado + is_staff).

    Los rankings ya compartidos que apuntaban a esta plantilla no se
    rompen ni se borran con ella: `TierList.tiers` ya tiene la copia
    congelada de cada ítem (con su imagen) desde el momento en que se
    guardó el ranking, así que alcanza con desvincular `template_id`
    (queda en null, el modelo ya lo permite — ver tier_list.py) antes
    de borrar la plantilla, en vez de dejar que la constraint de FK
    reviente el delete."""
    try:
        template_uuid = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(404, "Plantilla no encontrada") from None

    template = db.get(TierListTemplate, template_uuid)
    if template is None:
        raise HTTPException(404, "Plantilla no encontrada")

    db.query(TierList).filter(TierList.template_id == template_uuid).update(
        {"template_id": None}
    )
    db.delete(template)
    db.commit()


@router.post("/tierlists", response_model=TierListRead, status_code=201)
def create_tier_list(
    payload: TierListCreate,
    db: Annotated[Session, Depends(get_db)],
    # sin auth requerida: ranquear una plantilla ya existente es libre
    # para cualquiera, mismo criterio que TierMaker. Lo que sí exige login
    # es crear la plantilla (POST /tierlist-templates, arriba)
    _user: Annotated[User | None, Depends(get_current_user)],
) -> TierList:
    template = db.get(TierListTemplate, payload.template_id)
    if template is None:
        raise HTTPException(404, "Plantilla no encontrada")

    if len(payload.tiers) > MAX_TIERS:
        raise HTTPException(400, f"Máximo {MAX_TIERS} tiers")

    items_by_id = {item["id"]: item for item in template.items}
    seen: set[str] = set()
    resolved_tiers: dict[str, list[dict]] = {}

    for tier_label, item_ids in payload.tiers.items():
        if len(item_ids) > MAX_ITEMS:
            raise HTTPException(400, f"Demasiados ítems en el tier '{tier_label}'")
        resolved: list[dict] = []
        for item_id in item_ids:
            if item_id not in items_by_id:
                raise HTTPException(
                    400, f"El ítem '{item_id}' no pertenece a esta plantilla"
                )
            if item_id in seen:
                raise HTTPException(400, f"El ítem '{item_id}' está repetido")
            seen.add(item_id)
            resolved.append(items_by_id[item_id])
        resolved_tiers[tier_label] = resolved

    tier_list = TierList(template_id=template.id, tiers=resolved_tiers)
    db.add(tier_list)
    db.commit()
    db.refresh(tier_list)
    return tier_list


@router.get("/tierlists/{tier_list_id}", response_model=TierListRead)
def get_tier_list(
    tier_list_id: str, db: Annotated[Session, Depends(get_db)]
) -> TierList:
    tier_list = db.query(TierList).filter(TierList.id == tier_list_id).first()
    if tier_list is None:
        raise HTTPException(404, "Tier list no encontrada")
    return tier_list
