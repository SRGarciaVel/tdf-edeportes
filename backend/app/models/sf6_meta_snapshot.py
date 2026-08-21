import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SF6MetaSnapshot(Base):
    """Cache del "Meta actual" de SF6 (uso de personajes y diagrama de
    matchups) — datos globales de Capcom, no de TDF, sacados de una API
    pública real sin sesión ni cookies:
    streetfighter.com/6/buckler/api/en/stats/{snapshot_type}/{month}
    (confirmado 20-21/08/2026, ver ROADMAP.md). A diferencia del tracker
    de CFN, esto NO necesita Playwright — es una llamada HTTP simple,
    y se actualiza una vez al mes (el segundo jueves), no cada hora.

    `data` guarda la respuesta cruda del JSON tal cual — no tiene
    sentido normalizar ~30 personajes x 9 ligas x 2 tipos de control en
    tablas relacionales para algo que solo se lee, nunca se filtra por
    SQL (se lee entero y se procesa en el frontend)."""

    __tablename__ = "sf6_meta_snapshots"
    __table_args__ = (UniqueConstraint("snapshot_type", "month"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # "usagerate" | "usagerate_master" | "dia" | "dia_master"
    snapshot_type: Mapped[str] = mapped_column(String, nullable=False)
    # "yyyymm", ej. "202607" — mismo formato que usa la URL de Capcom
    month: Mapped[str] = mapped_column(String, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
