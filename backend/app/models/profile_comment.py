import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProfileComment(Base):
    """Comentario en el perfil de un jugador (/jugadores/{cfn_id}) —
    inspirado en los comentarios de perfil de Steam (referencia real
    que mandó Seba, 29-08-2026): otra razón para entrar al perfil de
    otra persona, no solo mirar sus stats.

    cfn_id es DE QUIÉN es el perfil comentado, no de quién escribe (eso
    es author_user_id) — decisión de Seba: cualquier persona logueada
    con Twitch puede comentar en cualquier perfil, esté o no en el
    roster ella misma, así que author_user_id no tiene por qué
    corresponder a ninguna fila de cfn_registrations."""

    __tablename__ = "profile_comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cfn_id: Mapped[str] = mapped_column(
        String, ForeignKey("cfn_registrations.cfn_id"), nullable=False, index=True
    )
    author_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    body: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
