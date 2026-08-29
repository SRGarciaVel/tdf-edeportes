import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InstagramHighlight(Base):
    """Un post de Instagram curado a mano por staff — las
    recopilaciones de streams que suben a @tdf_edeportes (pedido de
    Seba, 29-08-2026). Decisión de arquitectura: NO se conecta a la
    API de Instagram para traer un feed automático (eso pide token de
    Business/Creator + renovación cada ~60 días, de más para algo que
    suben "cada tanto", palabras de Seba) — cada fila es un link que
    staff pegó a mano, mostrado con el embed oficial tokenless de Meta
    (vigente desde el 15-06-2026, antes exigía App Review) del lado
    del frontend."""

    __tablename__ = "instagram_highlights"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    url: Mapped[str] = mapped_column(String, nullable=False)
    added_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
