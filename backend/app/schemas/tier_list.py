import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TierItem(BaseModel):
    id: str
    label: str
    image: str | None = None  # data URL — solo se define al crear una plantilla


class TierMeta(BaseModel):
    """Orden + color + nombre mostrado de un tier, en el orden real en que
    se muestran. Va separado de `tiers` (que sigue siendo label -> lista
    de ítems) porque Postgres JSONB no garantiza el orden de las keys de
    un objeto, pero sí el de los elementos de un array — este array ES la
    fuente de verdad del orden.

    `id` es la clave estable (coincide con las keys de `tiers`, ej. "S",
    "A", o un id generado como "tier-172...") — NUNCA cambia aunque se
    renombre el tier. `label` es el texto que se ve en pantalla, puede
    venir de un renombre (ej. alguien cambió "S" por "GODLIKE" con la
    tuerca del editor)."""

    id: str
    label: str
    color: str


class TierListTemplateCreate(BaseModel):
    name: str
    items: list[TierItem]


class TierListTemplateAddItems(BaseModel):
    """Body para agregar ítems nuevos a una plantilla ya existente — solo
    la lista, a diferencia de TierListTemplateCreate no lleva `name`
    (no se puede renombrar la plantilla desde acá)."""

    items: list[TierItem]


class TierListTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    items: list[TierItem]
    creator_name: str
    created_by: uuid.UUID
    created_at: datetime


class TierListTemplateSummary(BaseModel):
    """Versión liviana para el selector de "elegí una plantilla" — sin las
    imágenes completas de cada ítem, solo lo necesario para mostrar la
    lista y elegir una. `sample_images` es la excepción a propósito: unas
    pocas miniaturas (no todas) para que la tarjeta dé una pista visual
    de qué hay adentro, sin mandar la plantilla entera de nuevo."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    item_count: int
    creator_name: str
    sample_images: list[str] = []
    created_at: datetime


class TierListCreate(BaseModel):
    template_id: uuid.UUID
    # tier -> lista de IDs de ítems de esa plantilla (no el objeto
    # completo — el backend resuelve el ítem real desde la plantilla, así
    # nadie puede colar una imagen que no pasó por una plantilla creada
    # con login, ver app/api/tier_lists.py)
    tiers: dict[str, list[str]] = Field(default_factory=dict)
    # el orden real de despliegue + color elegido por tier (ver TierMeta)
    # — el backend valida que los labels acá coincidan exactamente con
    # las keys de `tiers`, ver create_tier_list
    tier_meta: list[TierMeta] = Field(default_factory=list)
    # solo se usa si quien guarda NO está logueado — si hay sesión, el
    # backend usa el display_name de Twitch y esto se ignora (no se
    # puede spoofear el nombre de otra persona estando logueado)
    creator_name: str | None = None
    # ancho en px de la columna de nombres, elegido arrastrando el borde
    # de la caja de color en el editor — límites generosos pero no
    # infinitos (Field ya rechaza con 422 lo que se pase de rango, ni
    # hace falta chequearlo a mano en el endpoint)
    label_width: int | None = Field(default=None, ge=48, le=240)


class TierListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    template_id: uuid.UUID | None
    creator_name: str
    created_by: uuid.UUID | None
    template_name: str | None
    tier_meta: list[TierMeta]
    tiers: dict[str, list[TierItem]]
    label_width: int | None
    created_at: datetime


class TierListSummary(BaseModel):
    """Versión liviana para la galería de "tier lists de la comunidad" —
    sin el contenido completo de cada tier (eso vive en el detalle,
    GET /tierlists/{id}), solo lo necesario para listar y elegir una."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    creator_name: str
    created_by: uuid.UUID | None
    template_name: str | None
    item_count: int
    created_at: datetime
