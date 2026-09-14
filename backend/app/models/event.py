import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    # torneo | stream | reunion | otro — sin enum de Postgres para no pagar
    # el costo de una migración extra cada vez que se agregue un tipo
    type: Mapped[str] = mapped_column(String, nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    description: Mapped[str | None] = mapped_column(Text)
    external_url: Mapped[str | None] = mapped_column(String)  # link a start.gg, etc.
    # staff | publico
    visibility: Mapped[str] = mapped_column(String, nullable=False, default="staff")

    # ambos solo se llenan para torneos sincronizados desde start.gg
    # (ver sync_startgg_tournaments.py) — NULL para todo lo demás,
    # incluidos torneos cargados a mano sin API
    attendee_count: Mapped[int | None] = mapped_column(Integer)
    # lista de {"placement": int, "gamertag": str} — top 3 del primer
    # evento/bracket del torneo. Si un torneo tuvo más de un
    # evento (ej. SF6 y Third Strike por separado), esto solo
    # refleja el primero que devuelve la API, no los dos — ver
    # comentario en services/startgg.py
    standings: Mapped[list[dict] | None] = mapped_column(JSONB)

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    creator: Mapped["User"] = relationship(back_populates="events_created")
    comments: Mapped[list["EventComment"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
