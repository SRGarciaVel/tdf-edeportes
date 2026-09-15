import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SFPersonalityResult(Base):
    """Resultado del test de personalidad de Street Fighter — solo se
    guarda para usuarios logueados (pedido explícito de Seba,
    13-09-2026: "que quede guardado, aunque sea solo para quien esté
    logueado"). El endpoint calcula y devuelve el resultado igual para
    invitados sin cuenta, simplemente no llega a esta tabla.

    Un usuario, un resultado — si repite el test, se actualiza la
    misma fila (no se acumula historial). Esto es lo que permite
    calcular estadísticas reales tipo "el 40% de TDF sacó Ken" sin
    contar dos veces a alguien que probó el test varias veces.

    `character_name` guarda el nombre completo tal como lo devuelve el
    motor de matching (incluye la era cuando aplica, ej. "Ryu (SF6)")
    — así las estadísticas por personaje/era salen directo de un
    GROUP BY sin tener que re-derivar nada."""

    __tablename__ = "sf_personality_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True
    )
    character_name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
