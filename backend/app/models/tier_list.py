import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TierList(Base):
    """Un ranking armado por alguien de la comunidad, a partir de una
    plantilla existente (TierListTemplate) — anónima (no requiere login,
    solo la creación de la plantilla en sí lo requiere), guardada para
    poder compartirla por link.

    `tiers` es una foto congelada de cómo quedó ranqueado, con los ítems
    completos (incluida su imagen) copiados desde la plantilla en el
    momento de guardar — así, si la plantilla se borra o cambia después,
    este ranking ya guardado no se ve afectado.

    `creator_name` y `template_name` son también una foto congelada, por
    la misma razón: si la plantilla se borra (template_id queda en null,
    ver DELETE /tierlist-templates) o el usuario logueado cambia su
    nombre de Twitch más adelante, esta tier list ya guardada sigue
    mostrando quién la armó y con qué plantilla, sin depender de que esas
    fuentes sigan existiendo.
    """

    __tablename__ = "tier_lists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # nullable: si en algún momento se borra la plantilla original, el
    # ranking ya guardado sigue existiendo igual (tiers ya tiene la copia)
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tier_list_templates.id"), nullable=True
    )
    # nombre de quien la armó: display_name de Twitch si estaba logueado,
    # o el nombre que escribió a mano si no — nunca vacío, el backend
    # resuelve "Anónimo" como default (ver app/api/tier_lists.py)
    creator_name: Mapped[str] = mapped_column(String, nullable=False)
    # copia del nombre de la plantilla al momento de guardar — sobrevive
    # aunque la plantilla se borre después
    template_name: Mapped[str | None] = mapped_column(String, nullable=True)
    # {"S": [{"id","label","image"}], "A": [...], ...}
    tiers: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
