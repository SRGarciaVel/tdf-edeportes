import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Game = Literal["sf6", "3s", "custom"]


class TierItem(BaseModel):
    """Un ítem dentro de un tier — para SF6/Third Strike es un personaje
    (label = nombre, sin imagen, se pinta con su color propio en el
    frontend). Para tier lists personalizadas, la comunidad sube su
    propia imagen (SPECS.md — sección de tier lists, requiere estar
    logueado, distinto criterio que los personajes)."""

    id: str
    label: str
    image: str | None = None  # data URL, solo se usa con game="custom"


class TierListCreate(BaseModel):
    game: Game
    tiers: dict[str, list[TierItem]] = Field(default_factory=dict)


class TierListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    game: Game
    tiers: dict[str, list[TierItem]]
    created_at: datetime


class TierListTemplateCreate(BaseModel):
    name: str
    items: list[TierItem]


class TierListTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    items: list[TierItem]
    created_at: datetime


class TierListTemplateSummary(BaseModel):
    """Versión liviana para listar "mis plantillas" sin mandar todas las
    imágenes de cada una — solo cuando se abre una puntual se pide el
    detalle completo."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    item_count: int
    created_at: datetime
