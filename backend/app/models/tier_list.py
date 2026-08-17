import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TierList(Base):
    """Una tier list armada por alguien de la comunidad — anónima (no
    requiere login, mismo criterio que TierMaker: cualquiera arma y
    comparte sin cuenta), guardada solo para poder compartirla por link.

    No se guardan retratos ni ningún arte de personajes — `tiers` es JSON
    con nombres de personaje como texto plano (ej. {"S": ["Jamie"], "A":
    ["Ryu", "Ken"], ...}), el frontend los pinta con su color propio
    (characterColors.ts), nunca con imágenes de Capcom (SPECS.md — sección
    de tier lists, decisión de no usar arte oficial ni de mods).
    """

    __tablename__ = "tier_lists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game: Mapped[str] = mapped_column(String, nullable=False)  # "sf6" | "3s"
    # {"S": ["Jamie", "Ryu"], "A": [...], ...} — orden de tiers y nombres
    # de personaje dentro de cada uno, tal cual los dejó quien la armó
    tiers: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
