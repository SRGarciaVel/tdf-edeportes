import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SF6CharacterFrameData(Base):
    """Cache de Frame Data y Command List oficiales de Capcom, un
    personaje por fila — mismo criterio que SF6MetaSnapshot (JSONB sin
    normalizar, se lee entero y se procesa en el frontend, nunca se
    filtra por SQL). Fuente: streetfighter.com/6/es-us/character/{slug}
    /frame y /movelist — mismo dominio oficial ya sancionado para el
    meta, no un tercero (idea de Chubi, 22-09-2026, ver ROADMAP.md).

    A diferencia del meta (una API JSON limpia), acá se parsea HTML
    real con BeautifulSoup en refresh_sf6_frame_data.py — el parser
    busca la tabla más grande de la página en vez de depender de
    nombres de clase específicos de Capcom, para no romperse ante
    cualquier cambio menor de diseño de su sitio. Casi seguro necesita
    un ajuste de selectores en la primera corrida real (mismo patrón
    que el scraper de CFN)."""

    __tablename__ = "sf6_character_frame_data"
    __table_args__ = (UniqueConstraint("character_slug"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # slug tal cual lo usa la URL de Capcom, ej. "ryu", "vega_mbison"
    character_slug: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    # cada uno: {"headers": [...], "sections": [{"title": str, "rows": [[...], ...]}]}
    frame_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    move_list: Mapped[dict] = mapped_column(JSONB, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
