import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SFPersonalityResult(Base):
    """Resultado del test de personalidad de Street Fighter — se
    guarda para CUALQUIERA que termine el test, logueado o no
    (cambiado 22-09-2026, pedido de Seba: "no todos van a loguearse,
    mejor que el volumen de datos no dependa de eso" — el diseño
    original de solo-logueados quedó demasiado conservador en la
    práctica). `user_id` nullable para los invitados.

    Para usuarios logueados: un usuario, un resultado — si repite el
    test, se actualiza la misma fila. Para invitados (user_id NULL):
    cada resultado es una fila nueva, sin intento de "actualizar" nada
    — no hay forma de saber si dos visitas anónimas son la misma
    persona, así que no tiene sentido tratarlas como si lo fueran.
    Postgres permite múltiples NULL en una columna UNIQUE (los NULL no
    se consideran iguales entre sí), así que la unicidad real —un
    usuario logueado, una fila— sigue funcionando sola sin lógica
    extra.

    `character_name` guarda el nombre completo tal como lo devuelve el
    motor de matching (incluye la era cuando aplica, ej. "Ryu (SF6)")
    — así las estadísticas por personaje/era salen directo de un
    GROUP BY sin tener que re-derivar nada."""

    __tablename__ = "sf_personality_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, unique=True
    )
    character_name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
