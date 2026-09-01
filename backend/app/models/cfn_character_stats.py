import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CFNCharacterStats(Base):
    """Win rate TOTAL por personaje (histórico completo desde que la
    persona empezó a jugar ese personaje), sacado directo de la pestaña
    /play del perfil de Buckler's Boot Camp (misma URL que ya usa
    get_advanced_stats en cfn_scraper.py para "Results", esto es otra
    sección de esa misma página).

    Ojo, esto es DISTINTO de agregar cfn_matches (que da win rate por
    ventana de días, ver GET /cfn/players/{id}/matches): cfn_matches solo
    acumula partidas vistas por nuestro propio cron desde que empezamos a
    trackear a cada jugador, nunca vamos a tener ahí el historial de
    ANTES de eso. El número "total" que muestra Capcom en /play sí lo
    tiene, así que para "win rate total con este personaje" hay que leer
    ese número directo de la página, no calcularlo con lo que tenemos
    acumulado nosotros.

    Igual que CFNProfile: cache que refresca scripts/refresh_cfn.py cada
    1 hora, nunca en vivo por request (SPECS.md §12).
    """

    __tablename__ = "cfn_character_stats"
    __table_args__ = (
        UniqueConstraint("cfn_id", "character_name", name="uq_cfn_character_stats"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cfn_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    # tal cual lo muestra Capcom en /play (ej. "Chun-Li", "M. Bison") -
    # GET /cfn/players/{id}/character-stats/{character_name} matchea
    # sin distinguir mayúsculas, así que el llamador no necesita saber
    # el casing exacto de memoria.
    character_name: Mapped[str] = mapped_column(String, nullable=False)
    matches_played: Mapped[int | None] = mapped_column(Integer)
    win_rate: Mapped[float | None] = mapped_column(
        Float
    )  # 0.0-1.0, None si nunca jugado
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
