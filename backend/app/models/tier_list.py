import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
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
    # {"S": [{"id","label","image"}], "A": [...], ...}
    tiers: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
