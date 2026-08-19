import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CFNMatch(Base):
    """Una partida individual, guardada por nosotros con cada corrida del
    cron (SPECS.md — historial de partidas). A diferencia de CFNProfile
    (una foto del estado actual, se pisa cada hora), esto se acumula con
    el tiempo — necesario para calcular win rate por rango de días, ya que
    no podemos confiar en que Buckler's Boot Camp mantenga suficiente
    historial hacia atrás en su propia página.

    `played_at` es la fecha/hora real de la partida (la que muestra el
    sitio), no la fecha en que la guardamos nosotros — importante para que
    los filtros de "último día" / "últimos 3 días" sean correctos.
    """

    __tablename__ = "cfn_matches"
    __table_args__ = (
        # evita duplicar la misma partida si el cron la vuelve a ver en
        # una corrida posterior (el sitio muestra las últimas N partidas,
        # así que se solapan entre corridas)
        UniqueConstraint("cfn_id", "played_at", "opponent_name", name="uq_cfn_match"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cfn_id: Mapped[str] = mapped_column(
        String, ForeignKey("cfn_profiles.cfn_id"), nullable=False, index=True
    )
    character_name: Mapped[str | None] = mapped_column(String)
    opponent_name: Mapped[str | None] = mapped_column(String)
    opponent_character: Mapped[str | None] = mapped_column(String)
    # CFN ID real del rival, sacado del link a su perfil dentro del modal
    # de detalle de la partida (la fila de la lista solo tiene su nombre
    # como texto plano, sin link — hay que clickear la partida para
    # llegar al modal donde sí es un link, ver cfn_scraper.py). Sin FK a
    # cfn_profiles a propósito: la gran mayoría de los rivales NO son
    # gente que trackeamos, este campo solo se usa para detectar cuando
    # SÍ lo son (ver GET /cfn/encounters/recent) — nullable también
    # porque no siempre se puede sacar (rival con perfil privado, o
    # partidas ya vistas en una corrida anterior no se re-consultan).
    opponent_cfn_id: Mapped[str | None] = mapped_column(String, index=True)
    won: Mapped[bool | None] = mapped_column(Boolean)  # null si no se pudo determinar
    played_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
