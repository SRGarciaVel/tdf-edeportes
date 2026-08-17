import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TierItem(BaseModel):
    id: str
    label: str
    image: str | None = None  # data URL — solo se define al crear una plantilla


class TierListTemplateCreate(BaseModel):
    name: str
    items: list[TierItem]


class TierListTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    items: list[TierItem]
    creator_name: str
    created_at: datetime


class TierListTemplateSummary(BaseModel):
    """Versión liviana para el selector de "elegí una plantilla" — sin las
    imágenes completas de cada ítem, solo lo necesario para mostrar la
    lista y elegir una."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    item_count: int
    creator_name: str
    created_at: datetime


class TierListCreate(BaseModel):
    template_id: uuid.UUID
    # tier -> lista de IDs de ítems de esa plantilla (no el objeto
    # completo — el backend resuelve el ítem real desde la plantilla, así
    # nadie puede colar una imagen que no pasó por una plantilla creada
    # con login, ver app/api/tier_lists.py)
    tiers: dict[str, list[str]] = Field(default_factory=dict)


class TierListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    template_id: uuid.UUID | None
    tiers: dict[str, list[TierItem]]
    created_at: datetime
