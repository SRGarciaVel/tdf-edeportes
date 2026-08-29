import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notification(Base):
    """Notificación genérica para un usuario — pensada desde el
    principio para más tipos que solo "me comentaron el perfil"
    (decisión de Seba, 29-08-2026: dejar la puerta abierta a
    aprobación de registro, etc., sin decidir esos otros tipos todavía).

    `type` identifica qué pasó ("comment_received" es el único que
    existe hoy) y `payload` guarda lo que ese tipo puntual necesita
    para mostrarse sin tener que volver a consultar otras tablas (ej.
    nombre y avatar de quien comentó, en vez de guardar solo el id del
    comentario y tener que resolverlo después — más simple, y sigue
    siendo válido aunque el comentario original se borre más tarde).
    """

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    # null = no leída. Se marca en bloque (todas a la vez) al abrir el
    # desplegable de la campanita, no una por una — mismo criterio que
    # Instagram/Facebook (pedido de Seba, 29-08-2026), no hace falta un
    # endpoint por notificación individual.
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
