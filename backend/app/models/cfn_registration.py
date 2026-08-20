import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CFNRegistration(Base):
    """Fuente de verdad de a quién se trackea en /jugadores — reemplaza el
    diccionario PLAYERS que antes vivía hardcodeado en
    scripts/refresh_cfn.py. Dos caminos para llegar acá:

    1. Auto-registro: alguien logueado con Twitch manda su CFN ID (POST
       /cfn/register), queda `status="pending"` hasta que staff lo
       apruebe (GET /cfn/registrations/pending + aprobar/rechazar) — así
       no hay que entrar a tocar código por cada persona nueva, pero
       tampoco aparece nadie sin que staff lo revise primero.
    2. Roster original: los que ya estaban en el diccionario viejo,
       migrados acá directo con status="approved" (ver migración de
       datos) — is_tdf y liquipedia_url puestos a mano para que
       coincidan con lo que ya mostraba /jugadores.

    scripts/refresh_cfn.py solo scrapea cfn_id de filas con
    status="approved" — por eso alcanza con este único campo para que
    "oculto hasta aprobar" funcione solo, sin necesitar filtrar en
    ningún otro lado: una fila pendiente nunca genera una fila en
    cfn_profiles, así que nunca aparece en /jugadores.
    """

    __tablename__ = "cfn_registrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cfn_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    # quién lo pidió, si fue por auto-registro — null para el roster
    # original migrado (nunca hubo un "pedido" de una cuenta puntual)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    # controlado por staff al aprobar, no derivado de is_staff del
    # usuario — alguien puede autoregistrarse siendo de la comunidad
    # sin ser del club, y no todo el roster original tiene cuenta
    is_tdf: Mapped[bool] = mapped_column(default=False)
    liquipedia_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # data URL, mismo formato/límite que las imágenes de tier list
    # (ver MAX_IMAGE_DATA_URL_LEN en tier_lists.py) — si no se manda,
    # /jugadores cae al avatar de Twitch del usuario si tiene cuenta, o
    # al círculo de iniciales de siempre si no tiene ninguno de los dos
    avatar_override: Mapped[str | None] = mapped_column(String, nullable=True)
    # foto de fondo de la card en /jugadores — a diferencia de
    # avatar_override (la foto de perfil chica), esto es la imagen grande
    # que le da identidad a la esquina de la card. La persona la puede
    # subir/cambiar cuando quiera después de estar aprobada (no solo al
    # registrarse), y staff la puede reemplazar o sacar en cualquier
    # momento si hace falta moderar — ver PATCH /cfn/register/me/background
    # (self) y POST/DELETE /cfn/players/{cfn_id}/background (staff).
    card_background_url: Mapped[str | None] = mapped_column(String, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
