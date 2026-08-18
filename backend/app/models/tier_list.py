import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TierList(Base):
    """Un ranking armado por alguien de la comunidad, a partir de una
    plantilla existente (TierListTemplate) — anónima (no requiere login,
    solo la creación de la plantilla en sí lo requiere), guardada para
    poder compartirla por link.

    `tiers` es una foto congelada de cómo quedó ranqueado, con los ítems
    completos (incluida su imagen) copiados desde la plantilla en el
    momento de guardar — así, si la plantilla se borra o cambia después,
    este ranking ya guardado no se ve afectado.

    `creator_name` y `template_name` son también una foto congelada, por
    la misma razón: si la plantilla se borra (template_id queda en null,
    ver DELETE /tierlist-templates) o el usuario logueado cambia su
    nombre de Twitch más adelante, esta tier list ya guardada sigue
    mostrando quién la armó y con qué plantilla, sin depender de que esas
    fuentes sigan existiendo.
    """

    __tablename__ = "tier_lists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # nullable: si en algún momento se borra la plantilla original, el
    # ranking ya guardado sigue existiendo igual (tiers ya tiene la copia)
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tier_list_templates.id"), nullable=True
    )
    # id del usuario logueado que la guardó — null si la guardó alguien
    # sin sesión (invitado). A diferencia de TierListTemplate.created_by
    # (que siempre existe, porque crear una plantilla exige login), acá
    # puede ser null de verdad: no hay forma de verificar "dueño" de un
    # invitado que solo escribió un nombre a mano, cualquiera pudo haber
    # tipeado el nombre de otra persona. DELETE /tierlists/{id} usa esto
    # para permitir borrar a quien la creó (si created_by no es null) o a
    # cualquier staff — las guardadas sin sesión solo las borra staff.
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    # nombre de quien la armó: display_name de Twitch si estaba logueado,
    # o el nombre que escribió a mano si no — nunca vacío, el backend
    # resuelve "Anónimo" como default (ver app/api/tier_lists.py)
    creator_name: Mapped[str] = mapped_column(String, nullable=False)
    # copia del nombre de la plantilla al momento de guardar — sobrevive
    # aunque la plantilla se borre después
    template_name: Mapped[str | None] = mapped_column(String, nullable=True)
    # [{"label": "S", "color": "bg-red-500/40 border-red-500/70"}, ...] —
    # el ORDEN de despliegue y el color elegido por tier, en ESE orden.
    # Va en un array (no en las keys de `tiers`) a propósito: Postgres
    # JSONB preserva el orden de los elementos de un array, pero NO
    # garantiza el orden de las keys de un objeto (está documentado así
    # por Postgres). Guardar el orden en las keys de `tiers` fue el bug
    # original: el tier S terminaba mostrándose al final porque Postgres
    # reordenaba las keys alfabéticamente al leer de vuelta.
    tier_meta: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    # {"S": [{"id","label","image"}], "A": [...], ...} — el ORDEN de estas
    # keys ya no se usa para nada (ver tier_meta arriba), es solo un mapa
    # label -> ítems
    tiers: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
