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
    # "Records" — promedios de Capcom sobre las últimas 100 partidas, de
    # la pestaña Stats > Results del perfil (SPECS.md, conversación
    # 20-08-2026). Distinto de MR/LP/rango: esto no es "estado actual del
    # jugador", es "cómo juega en promedio" — de ahí sale el ranking de
    # /jugadores tipo "el que más Drive Impact se come", "mejor Perfect
    # Parry de la comunidad", etc. Todos nullable: si el scrape de esta
    # sección puntual falla, el resto del perfil (MR/LP/historial) sigue
    # funcionando igual, no se cae todo junto.
    drive_impact_received: Mapped[float | None] = mapped_column()  # "se come más DI"
    drive_parry_perfect: Mapped[float | None] = mapped_column()  # "mejor Perfect Parry"
    drive_impact_punish_landed: Mapped[float | None] = mapped_column()  # "DI más letal"
    corner_time_opponent: Mapped[float | None] = (
        mapped_column()
    )  # "el más agresivo" (segundos)
    throws_landed: Mapped[float | None] = mapped_column()  # "mejor agarrador"
    # null si el último refresh falló (ej. Capcom cambió el HTML) — se
    # muestra "Próximamente" en el frontend en vez de datos viejos sin avisar
    last_error: Mapped[str | None] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
