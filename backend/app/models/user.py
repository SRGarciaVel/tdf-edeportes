import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    twitch_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    twitch_username: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # login alternativo, opcional (SPECS.md #6)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # nivel por encima de Staff — solo AckermanFG (programador) y
    # bazthyfreeman (CEO), pedido explícito de Seba (29-08-2026).
    # MISMO criterio que is_staff: se asigna a mano en la base, NUNCA
    # desde ningún endpoint (ni siquiera el panel de Administración
    # que este mismo campo desbloquea puede otorgar is_admin a nadie —
    # ver app/api/admin.py, esa es la línea que no se cruza).
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    roles: Mapped[list["Role"]] = relationship(
        secondary="user_roles", back_populates="users"
    )
    events_created: Mapped[list["Event"]] = relationship(back_populates="creator")
    comments: Mapped[list["EventComment"]] = relationship(back_populates="author")
