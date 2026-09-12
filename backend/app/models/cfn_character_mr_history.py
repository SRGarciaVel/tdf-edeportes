import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CFNCharacterMRHistory(Base):
    """Snapshot DIARIO de Master Rate + tier por personaje — sobrevive
    a que cfn_character_stats se pise cada hora con el estado "actual"
    (ver ese modelo). Nunca se borra (pedido de Seba, 12-09-2026:
    "guardarlo como dato histórico, le podemos dar uso más adelante" —
    todavía no hay un uso concreto decidido, esto es solo la captura;
    ver ROADMAP.md para "evolución del MR en el tiempo" como idea
    pendiente).

    Un snapshot POR DÍA, no por corrida del cron (que hoy corre cada
    hora) — si el cron corre varias veces el mismo día, la fila de ESE
    día se actualiza con el último valor visto, nunca se inserta una
    fila nueva por corrida (ver el upsert en save_character_stats,
    refresh_cfn.py). Solo se guarda snapshot cuando hay un MR real
    (master_rating is not None) — un personaje que la persona jugó
    pero nunca llevó a Master no aporta nada a un historial de "cómo
    subió el MR con el tiempo"."""

    __tablename__ = "cfn_character_mr_history"
    __table_args__ = (
        UniqueConstraint(
            "cfn_id",
            "character_name",
            "snapshot_date",
            name="uq_cfn_character_mr_history",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cfn_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    character_name: Mapped[str] = mapped_column(String, nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    master_rating: Mapped[int | None] = mapped_column(Integer)
    tier: Mapped[str | None] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
