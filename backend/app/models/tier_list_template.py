import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User


class TierListTemplate(Base):
    """Un preset guardado por un usuario logueado — un set de ítems
    (con sus imágenes ya redimensionadas) que cualquiera puede usar para
    armar su propio ranking, sin necesitar cuenta (solo crear la
    plantilla en sí requiere login — SPECS.md, sección de tier lists).
    Pública: aparece listada para toda la comunidad, con el nombre de
    quien la creó.
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

    creator: Mapped["User"] = relationship()
