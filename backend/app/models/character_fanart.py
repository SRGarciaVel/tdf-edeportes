import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CharacterFanart(Base):
    """Fan art subido por la comunidad para la tarjeta de un personaje
    en /personajes — NUNCA arte oficial de Capcom (mismo principio que
    Tier List: el sitio es alojador de contenido de terceros, no un
    roster propio con retratos de personajes de Capcom, ver
    SPECS.md §16). Un solo fan art por personaje — se reemplaza al
    subir uno nuevo, no se guarda historial de versiones anteriores.

    Subida restringida a UNA cuenta específica (AckermanFG, pedido
    explícito de Seba, 12-09-2026) — deliberadamente más angosto que
    is_admin (que además incluye a bazthyfreeman), ver
    require_ackermanfg en api/deps.py."""

    __tablename__ = "character_fanart"

    character_name: Mapped[str] = mapped_column(String, primary_key=True)
    image_data_url: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
