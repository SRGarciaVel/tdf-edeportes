import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FodaEntry(Base):
    """Un análisis FODA de la comunidad sobre un jugador — pedido del
    CEO vía Seba (29-08-2026) para una actividad puntual con
    Pochoclo23, Younghou y Kane Blueriver, pero a propósito SIN
    restringir `subject_name` a esos tres nombres (palabras de Seba:
    "lo podemos dejar abierto igual, total no molestaría") — cualquiera
    puede mandar un FODA sobre cualquier nombre que escriba, no hay
    validación contra el roster.

    Mismo patrón que TierList para el autor (ver ese modelo):
    created_by nullable + author_name como foto congelada (display_name
    de Twitch si estaba logueado, o el nombre que escribió a mano si
    no) — así sobrevive aunque la cuenta cambie de nombre después, y
    funciona igual para invitados sin cuenta.

    Los 4 campos son String sin max_length en la columna a propósito
    (pedido explícito: "sin límites de caracteres, se deben explayar")
    — el tope real de seguridad vive en el schema (MAX_FODA_FIELD_LEN),
    generoso pero no infinito."""

    __tablename__ = "foda_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    subject_name: Mapped[str] = mapped_column(String, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    author_name: Mapped[str] = mapped_column(String, nullable=False)
    fortalezas: Mapped[str] = mapped_column(String, nullable=False)
    oportunidades: Mapped[str] = mapped_column(String, nullable=False)
    debilidades: Mapped[str] = mapped_column(String, nullable=False)
    amenazas: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
