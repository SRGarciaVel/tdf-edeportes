import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CFNProfile(Base):
    """Cache de stats de Street Fighter 6 por jugador. Se refresca por un
    script aparte (backend/scripts/refresh_cfn.py), nunca en vivo por
    request — ver SPECS.md #12 (cachear reduce carga sobre la cuenta
    "visora" y el riesgo de que Capcom note actividad inusual)."""

    __tablename__ = "cfn_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cfn_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String)
    league_rank: Mapped[str | None] = mapped_column(String)  # ej. "Platinum"
    league_points: Mapped[int | None] = mapped_column(Integer)
    master_rating: Mapped[int | None] = mapped_column(Integer)  # solo si es Master+
    character_name: Mapped[str | None] = mapped_column(String)  # personaje principal
    # null si el último refresh falló (ej. Capcom cambió el HTML) — se
    # muestra "Próximamente" en el frontend en vez de datos viejos sin avisar
    last_error: Mapped[str | None] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
