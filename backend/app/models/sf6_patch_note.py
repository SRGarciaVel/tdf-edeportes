import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SF6PatchNote(Base):
    """Cache de las notas de parche de SF6 — datos globales de Capcom (no
    de TDF), sacados de streetfighter.com/6/buckler/battle_change/{patch_id}
    y sus sub-páginas por personaje (.../battle_change/{patch_id}/{tool_name}).
    A diferencia de sf6_meta_snapshots, esto SÍ necesita parsear HTML real
    (no hay una API JSON pública para esto, confirmado 21-08-2026) — usa
    httpx + BeautifulSoup, sin Playwright (las páginas son HTML normal del
    servidor, no requieren JS para renderizar el contenido).

    `data` guarda todo el contenido estructurado de un parche entero
    (resumen general + cambios universales + el detalle de cada personaje
    que tuvo cambios ese parche) en un solo JSONB — no tiene sentido una
    tabla separada por personaje para algo que siempre se lee entero de
    una, nunca se filtra por SQL."""

    __tablename__ = "sf6_patch_notes"
    __table_args__ = (UniqueConstraint("patch_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # "yyyymmdd" tal cual aparece en la URL de Capcom, ej. "20260803"
    patch_id: Mapped[str] = mapped_column(String, nullable=False)
    # título tal cual lo muestra Capcom, ej. "08.03.2026 update"
    title: Mapped[str] = mapped_column(String, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
