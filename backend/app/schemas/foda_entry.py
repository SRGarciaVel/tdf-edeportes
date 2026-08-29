import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# sin límite "de UI" (pedido explícito de Seba, 29-08-2026: "sin
# límites de caracteres, se deben explayar") — pero SÍ un tope de
# seguridad generoso del lado del servidor. Nunca aceptar texto de
# largo verdaderamente ilimitado: un payload de varios MB por campo es
# un vector de denial-of-service barato, aunque ninguna persona real
# lo note en el uso normal (20.000 caracteres son ~15 páginas de texto
# por cuadrante, de sobra para explayarse).
MAX_FODA_FIELD_LEN = 20_000
MAX_SUBJECT_NAME_LEN = 80
# mismo límite que ya usa tier list para el nombre de invitado
# (MAX_CREATOR_NAME_LEN en tier_lists.py) — mismo criterio, mismo valor
MAX_GUEST_NAME_LEN = 40


class FodaEntryCreate(BaseModel):
    subject_name: str = Field(min_length=1, max_length=MAX_SUBJECT_NAME_LEN)
    # solo se usa si quien manda el POST no está logueado — si está
    # logueado, el backend ignora esto y usa el display_name real (no
    # se puede spoofear el nombre de otra persona, mismo criterio que
    # tier list)
    author_name: str | None = Field(default=None, max_length=MAX_GUEST_NAME_LEN)
    # default público — elegido por quien lo manda (ver
    # FodaEntry.is_public en el modelo para la lógica de visibilidad)
    is_public: bool = True
    fortalezas: str = Field(min_length=1, max_length=MAX_FODA_FIELD_LEN)
    oportunidades: str = Field(min_length=1, max_length=MAX_FODA_FIELD_LEN)
    debilidades: str = Field(min_length=1, max_length=MAX_FODA_FIELD_LEN)
    amenazas: str = Field(min_length=1, max_length=MAX_FODA_FIELD_LEN)


class FodaEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subject_name: str
    author_name: str
    is_public: bool
    fortalezas: str
    oportunidades: str
    debilidades: str
    amenazas: str
    created_at: datetime
    # true si quien pide la lista puede borrar ESTA entrada puntual
    # (quien la creó, si estaba logueado, o staff) — resuelto en el
    # backend para no duplicar esa lógica en el frontend, mismo
    # criterio que ProfileCommentRead.can_delete
    can_delete: bool
