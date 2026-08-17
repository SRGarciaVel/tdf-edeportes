import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TierListTemplate(Base):
    """Un preset guardado por un usuario logueado — un set de ítems
    (con sus imágenes ya redimensionadas) que se puede volver a cargar en
    el editor sin re-subir nada. Solo para tier lists personalizadas
    (SPECS.md — sección de tier lists); SF6 y Third Strike no necesitan
    esto, su roster siempre está disponible.

    A diferencia de TierList (que es anónima, sin dueño), esto SÍ requiere
    estar logueado — son las propias imágenes de la persona, tiene sentido
    que le pertenezcan a su cuenta.
    """

    __tablename__ = "tier_list_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    # [{"id": "...", "label": "...", "image": "data:image/webp;base64,..."}]
    items: Mapped[list] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
