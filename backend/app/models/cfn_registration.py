import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
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
    # bio corta, opcional — la propia persona la escribe/edita cuando
    # quiere desde /jugadores (PATCH /cfn/register/me/profile), igual
    # que avatar_override pero como texto en vez de imagen. Límite de
    # largo vive en el schema (MyProfileUpdate), no acá.
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    # banner de /perfil — DISTINTO de card_background_url (pedido
    # explícito de Seba, 29-08-2026: son dos imágenes con propósitos
    # distintos, aunque compartan el mismo pipeline de subida en el
    # frontend. card_background_url es la foto de fondo de la card
    # pública en /jugadores; banner_url es solo la portada de la página
    # de perfil (propia o la de otro jugador). Antes reusaban el mismo
    # campo por conveniencia, pero mezclaba dos conceptos.
    banner_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # foto de fondo de la card en /jugadores — a diferencia de
    # avatar_override (la foto de perfil chica), esto es la imagen grande
    # que le da identidad a la esquina de la card. La persona la puede
    # subir/cambiar cuando quiera después de estar aprobada (no solo al
    # registrarse), y staff la puede reemplazar o sacar en cualquier
    # momento si hace falta moderar — ver PATCH /cfn/register/me/background
    # (self) y POST/DELETE /cfn/players/{cfn_id}/background (staff).
    card_background_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # brillo promedio (0.0 negro puro, 1.0 blanco puro) de
    # card_background_url, calculado UNA sola vez en el navegador de
    # quien sube la foto (canvas, muestreo de píxeles) y guardado acá —
    # así el frontend no tiene que recalcularlo en cada carga de página
    # para cada visitante. Se usa para atenuar más la foto cuanto más
    # clara sea (overlay más fuerte con fotos claras, más suave con
    # oscuras) sin cambiar nunca el color del texto — conversación de
    # diseño, 20-08-2026. Null si nunca se subió una foto, o si se subió
    # antes de que existiera este campo (cae a un valor medio por
    # default en el frontend).
    card_background_brightness: Mapped[float | None] = mapped_column(nullable=True)
    # hasta 5 links a redes sociales, editables por la propia persona
    # sin aprobación (mismo criterio libre que bio) — [{platform, label,
    # url}], platform es uno de instagram/x/youtube/twitch/other; label
    # solo se usa quen platform="other" (el resto usa un label fijo del
    # frontend). Ver schemas/cfn.py:SocialLink para la validación real.
    social_links: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
