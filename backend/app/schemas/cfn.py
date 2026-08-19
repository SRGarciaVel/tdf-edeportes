import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

CFN_ID_RE = re.compile(r"^\d{5,20}$")


class CFNProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cfn_id: str
    display_name: str | None
    league_rank: str | None
    league_points: int | None
    master_rating: int | None
    character_name: str | None
    updated_at: datetime
    # si no es None, el frontend debe mostrar "Próximamente" en vez de
    # datos parciales/viejos sin avisar
    last_error: str | None


class CFNPlayerRead(BaseModel):
    """Lo que necesita /jugadores para pintar una card — metadata del
    roster (nombre, TDF, Liquipedia, avatar) fusionada con el cache de
    stats (rango, LP, personaje). Antes esto vivía repartido entre un
    array hardcodeado en el frontend (nombre/TDF/Liquipedia) y
    CFNProfileRead acá (solo stats) — un jugador recién aprobado puede
    no tener fila en cfn_profiles todavía (el cron corre cada hora),
    por eso todos los campos de stats son opcionales acá."""

    cfn_id: str
    display_name: str
    is_tdf: bool
    liquipedia_url: str | None
    # avatar_override si tiene uno propio, si no el avatar de Twitch de
    # la cuenta que lo registró, si no None — el frontend cae al
    # círculo de iniciales de siempre cuando esto es None
    avatar_url: str | None
    league_rank: str | None
    league_points: int | None
    master_rating: int | None
    character_name: str | None
    updated_at: datetime | None
    last_error: str | None


class CFNRegistrationCreate(BaseModel):
    cfn_id: str
    # mismo formato/límite que las imágenes de tier list — ver
    # MAX_IMAGE_DATA_URL_LEN en tier_lists.py, mismo criterio acá
    avatar_override: str | None = Field(default=None, max_length=200_000)

    @field_validator("cfn_id")
    @classmethod
    def validate_cfn_id(cls, v: str) -> str:
        if not CFN_ID_RE.match(v):
            raise ValueError("El CFN ID debe ser solo números (5 a 20 dígitos)")
        return v


class CFNRegistrationRead(BaseModel):
    """Lo que ve la propia persona sobre su solicitud — GET
    /cfn/register/me, para que el frontend sepa si mostrar el
    formulario, un "pendiente de revisión", o nada porque ya está
    aprobada (en ese caso ya aparece en /jugadores directamente)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cfn_id: str
    display_name: str
    status: str
    requested_at: datetime
    reviewed_at: datetime | None


class CFNRegistrationPending(BaseModel):
    """Para el panel de moderación de staff — a diferencia de
    CFNRegistrationRead, incluye datos de la cuenta de Twitch que la
    pidió (para que staff pueda reconocer a la persona real detrás del
    pedido, no solo el nombre que escribió)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cfn_id: str
    display_name: str
    requested_at: datetime
    twitch_username: str
    twitch_display_name: str
    twitch_avatar_url: str | None


class CFNRegistrationDecision(BaseModel):
    """Body de POST .../approve — deja que staff ajuste el nombre final,
    la etiqueta TDF y el link de Liquipedia antes de publicar, en vez de
    aceptar ciegamente lo que la persona escribió al pedirlo."""

    display_name: str | None = None
    is_tdf: bool = False
    liquipedia_url: str | None = None


class CFNMatchStats(BaseModel):
    """Agregado de partidas de un jugador en una ventana de días — no
    devuelve las partidas en sí, solo el resumen (win rate, personajes
    usados), pensado para no tener que mandar cada partida individual al
    frontend a medida que el historial crece con el tiempo."""

    cfn_id: str
    days: int
    total_matches: int
    wins: int
    losses: int
    # None si total_matches es 0 — no hay "0% de winrate", hay "sin datos"
    win_rate: float | None
    # personaje -> cuántas veces se usó en la ventana, ordenado de más a
    # menos usado
    characters: dict[str, int]


class CFNMatchRead(BaseModel):
    """Una partida individual — a diferencia de CFNMatchStats (el
    agregado), esto es para cuando hace falta ver el detalle real, partida
    por partida (ej. el modal de historial en /jugadores), no solo un
    resumen tipo 'Zangief x23, Akuma x14...' que no dice cuándo pasó qué."""

    model_config = ConfigDict(from_attributes=True)

    played_at: datetime
    character_name: str | None
    opponent_name: str | None
    opponent_character: str | None
    won: bool | None


class EncounterRead(BaseModel):
    """Un cruce entre dos jugadores TRACKEADOS por TDF (no cualquier
    partida — solo cuando el rival también es alguien que seguimos). Cada
    partida así queda registrada dos veces en cfn_matches (una vez desde
    la perspectiva de cada jugador) — GET /cfn/encounters/recent dedupea
    por par sin importar el orden antes de armar esto, así que acá "a" y
    "b" son arbitrarios, no hay un lado "dueño" del cruce."""

    player_a_cfn_id: str
    player_a_name: str
    player_b_cfn_id: str
    player_b_name: str
    played_at: datetime
