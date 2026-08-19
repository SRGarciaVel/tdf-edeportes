import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_authenticated, require_staff
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import TierList, TierListTemplate, User
from app.schemas.tier_list import (
    TierListCreate,
    TierListRead,
    TierListSummary,
    TierListTemplateCreate,
    TierListTemplateRead,
    TierListTemplateSummary,
)

router = APIRouter(tags=["tierlists"])

MAX_TIERS = 12
# eran una sola constante compartida (MAX_ITEMS = 60) — se separan porque
# son límites de cosas distintas: una plantilla grande y legítima (ej. un
# roster completo de dulces chilenos, más de 100 fácil) no tiene nada que
# ver con cuántos ítems tiene sentido amontonar en UN solo tier al
# ranquear. Bug real reportado por Seba: subir 144 imágenes a una
# plantilla nueva daba 400 "Demasiados ítems en la plantilla" porque
# 144 > 60.
MAX_TEMPLATE_ITEMS = 300
MAX_TIER_ITEMS = 100
MAX_IMAGE_DATA_URL_LEN = 200_000  # ~150KB en base64, generoso para 120x120
IMAGE_DATA_URL_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp);base64,")
MAX_CREATOR_NAME_LEN = 40
MAX_TIER_LISTS_LISTED = 100  # sin paginación todavía — no hay volumen que
# la justifique aún, se agrega si esta pantalla crece (mismo criterio que
# el resto del proyecto, ver CODESTYLE.md "elegancia sobre parches")

# debe coincidir exactamente con TIER_PALETTE en TierListPage.tsx — es la
# misma duplicación ya aceptada en el proyecto para otras validaciones
# (ver IMAGE_DATA_URL_RE arriba); si el color no viene de esta lista, se
# rechaza en vez de guardar un className arbitrario mandado por el cliente
TIER_COLOR_CHOICES = frozenset(
    {
        "bg-red-500/40 border-red-500/70",
        "bg-orange-500/40 border-orange-500/70",
        "bg-yellow-500/40 border-yellow-500/70",
        "bg-lime-500/40 border-lime-500/70",
        "bg-emerald-500/40 border-emerald-500/70",
        "bg-teal-500/40 border-teal-500/70",
        "bg-sky-500/40 border-sky-500/70",
        "bg-purple-500/40 border-purple-500/70",
        "bg-fuchsia-500/40 border-fuchsia-500/70",
        "bg-pink-500/40 border-pink-500/70",
        "bg-gray-500/40 border-gray-500/70",
        "bg-stone-500/40 border-stone-500/70",
    }
)


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
        "created_by": template.created_by,
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
    if len(payload.items) > MAX_TEMPLATE_ITEMS:
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
        "created_by": template.created_by,
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


@router.delete("/tierlist-templates/{template_id}/items/{item_id}", status_code=204)
def delete_template_item(
    template_id: str,
    item_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> None:
    """Borra UN ítem puntual de una plantilla ya guardada (a diferencia de
    DELETE /tierlist-templates/{id}, que borra la plantilla entera) —
    pensado para el caso de subir un lote grande de imágenes y que se
    cuele una repetida.

    A diferencia del borrado de la plantilla completa (solo staff), acá
    puede hacerlo quien la creó O cualquier staff: corregir tu propio
    error no debería depender de pedirle el favor a alguien más, pero
    tocar la plantilla de otra persona sigue necesitando staff.

    Los rankings ya guardados que usaban este ítem no se ven afectados —
    ya tienen su copia congelada, ver TierList.tiers."""
    try:
        template_uuid = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(404, "Plantilla no encontrada") from None

    template = db.get(TierListTemplate, template_uuid)
    if template is None:
        raise HTTPException(404, "Plantilla no encontrada")

    if template.created_by != user.id and not user.is_staff:
        raise HTTPException(403, "No tienes permiso para editar esta plantilla")

    remaining = [i for i in template.items if i["id"] != item_id]
    if len(remaining) == len(template.items):
        raise HTTPException(404, "Ítem no encontrado en esta plantilla")
    if len(remaining) == 0:
        raise HTTPException(400, "No puedes borrar el último ítem de la plantilla")

    template.items = remaining
    db.commit()


@router.post("/tierlists", response_model=TierListRead, status_code=201)
# límite más estricto que el default de la app (300/hora) porque este es
# el ÚNICO endpoint de escritura que no exige ninguna cuenta — informe de
# seguridad 18-08-2026, hallazgo #6. Mitiga el riesgo de spam sin romper
# el ranquear-sin-login que es intencional (ver comentario del parámetro
# user, más abajo).
@limiter.limit("20/hour")
def create_tier_list(
    request: Request,
    payload: TierListCreate,
    db: Annotated[Session, Depends(get_db)],
    # sin auth requerida: ranquear una plantilla ya existente es libre
    # para cualquiera, mismo criterio que TierMaker. Lo que sí exige login
    # es crear la plantilla (POST /tierlist-templates, arriba)
    user: Annotated[User | None, Depends(get_current_user)],
) -> TierList:
    template = db.get(TierListTemplate, payload.template_id)
    if template is None:
        raise HTTPException(404, "Plantilla no encontrada")

    if len(payload.tiers) > MAX_TIERS:
        raise HTTPException(400, f"Máximo {MAX_TIERS} tiers")

    # tier_meta es la fuente de verdad del orden Y del nombre mostrado
    # (ver TierMeta) — sus ids tienen que ser EXACTAMENTE el mismo set
    # que las keys de tiers, ni de más ni de menos, y cada color tiene
    # que venir de la paleta conocida (no un className arbitrario mandado
    # por el cliente)
    meta_ids = {m.id for m in payload.tier_meta}
    tier_keys = set(payload.tiers.keys())
    if meta_ids != tier_keys:
        raise HTTPException(400, "tier_meta no coincide con los tiers enviados")
    for m in payload.tier_meta:
        if m.color not in TIER_COLOR_CHOICES:
            raise HTTPException(400, f"Color inválido para el tier '{m.label}'")

    items_by_id = {item["id"]: item for item in template.items}
    seen: set[str] = set()
    resolved_tiers: dict[str, list[dict]] = {}

    for tier_label, item_ids in payload.tiers.items():
        if len(item_ids) > MAX_TIER_ITEMS:
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

    # logueado: se usa el display_name de Twitch, no lo que haya mandado
    # el cliente en creator_name (no se puede spoofear el nombre de otra
    # persona estando logueado). Sin login: el nombre que escribió a
    # mano, recortado y con "Anónimo" como default si vino vacío.
    if user is not None:
        creator_name = user.display_name
    else:
        raw_name = (payload.creator_name or "").strip()
        creator_name = raw_name[:MAX_CREATOR_NAME_LEN] if raw_name else "Anónimo"

    tier_list = TierList(
        template_id=template.id,
        template_name=template.name,
        creator_name=creator_name,
        created_by=user.id if user is not None else None,
        tier_meta=[m.model_dump() for m in payload.tier_meta],
        tiers=resolved_tiers,
    )
    db.add(tier_list)
    db.commit()
    db.refresh(tier_list)
    return tier_list


@router.get("/tierlists", response_model=list[TierListSummary])
def list_tier_lists(db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    """Público, sin auth — la galería de tier lists YA ARMADAS por la
    comunidad (a diferencia de /tierlist-templates, que lista las
    plantillas en blanco para empezar a ranquear). Las más nuevas
    primero."""
    tier_lists = (
        db.query(TierList)
        .order_by(TierList.created_at.desc())
        .limit(MAX_TIER_LISTS_LISTED)
        .all()
    )
    return [
        {
            "id": t.id,
            "creator_name": t.creator_name,
            "created_by": t.created_by,
            "template_name": t.template_name,
            "item_count": sum(len(items) for items in t.tiers.values()),
            "created_at": t.created_at,
        }
        for t in tier_lists
    ]


@router.get("/tierlists/{tier_list_id}", response_model=TierListRead)
def get_tier_list(
    tier_list_id: str, db: Annotated[Session, Depends(get_db)]
) -> TierList:
    tier_list = db.query(TierList).filter(TierList.id == tier_list_id).first()
    if tier_list is None:
        raise HTTPException(404, "Tier list no encontrada")
    return tier_list


@router.delete("/tierlists/{tier_list_id}", status_code=204)
def delete_tier_list(
    tier_list_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> None:
    """Puede borrarla quien la guardó (si la guardó logueado, ver
    created_by) O cualquier staff. Las tier lists guardadas por invitados
    sin sesión (created_by null) solo las puede borrar staff — no hay
    forma de verificar que un invitado sea "el mismo" que la guardó,
    cualquiera pudo haber escrito cualquier nombre a mano. Esto es lo que
    permite limpiar las guardadas antes de que existiera created_by."""
    try:
        tier_list_uuid = uuid.UUID(tier_list_id)
    except ValueError:
        raise HTTPException(404, "Tier list no encontrada") from None

    tier_list = db.get(TierList, tier_list_uuid)
    if tier_list is None:
        raise HTTPException(404, "Tier list no encontrada")

    if tier_list.created_by != user.id and not user.is_staff:
        raise HTTPException(403, "No tienes permiso para borrar esta tier list")

    db.delete(tier_list)
    db.commit()
