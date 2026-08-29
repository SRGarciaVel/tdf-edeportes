import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

CFN_ID_RE = re.compile(r"^\d{5,20}$")
# límite de siempre (avatar/fondo/banner estáticos, WebP comprimido) —
# ver MAX_IMAGE_DATA_URL_LEN en tier_lists.py, mismo criterio
MAX_IMAGE_DATA_URL_LEN = 200_000
# avatar/fondo/banner en avatar_override, card_background_url y
# banner_url usan este límite más generoso en vez del de arriba
# (pedido de Seba, 29-08-2026: soportar GIF animado ahí). Un GIF no
# pasa por el pipeline de canvas/WebP de siempre — no se puede, canvas
# solo captura un frame fijo — así que se sube "tal cual" hasta 5MB de
# archivo original; en base64 eso son ~6.7MB de texto, 7_500_000 deja
# margen. Costo real a tener en cuenta si el roster crece mucho: estos
# tres campos viajan enteros en CADA fila de GET /cfn/players (la lista
# pública completa), así que muchos GIFs pesados ahí inflan esa
# respuesta bastante — vale la pena revisarlo si se vuelve un problema
# real, no antes.
MAX_ANIMATABLE_DATA_URL_LEN = 7_500_000
# auditoría de seguridad (29-08-2026): avatar_override, banner_url y
# card_background_url solo tenían límite de largo, nunca se validó que
# el contenido fuera de verdad una imagen en base64 — un usuario podía
# mandar cualquier string, incluida una URL externa (ej.
# "https://evil.com/tracker.gif"), que el frontend renderiza tal cual
# en un <img src>. Eso filtra la IP/fingerprint de CUALQUIERA que vea
# ese perfil a un tercero (pixel de tracking), sin pasar por nuestro
# pipeline de subida en absoluto. Mismo patrón que ya existía en
# tier_lists.py (IMAGE_DATA_URL_RE) — acá con "gif" sumado porque estos
# tres campos sí soportan animado (ver MAX_ANIMATABLE_DATA_URL_LEN).
PROFILE_IMAGE_DATA_URL_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp|gif);base64,")


def _validate_profile_image(v: str | None) -> str | None:
    if v is not None and not PROFILE_IMAGE_DATA_URL_RE.match(v):
        raise ValueError(
            "La imagen tiene que venir de la subida normal del sitio, no un link externo"
        )
    return v


class SocialLink(BaseModel):
    """Un link de red social del perfil — hasta 5 por persona (ver
    MyProfileUpdate). Los 4 predefinidos muestran su propio ícono de
    marca en el frontend con un label fijo ahí mismo; "other" es el
    único caso donde label es de verdad libre (para links que no son
    de ninguna red conocida, ej. un portfolio o un Linktree)."""

    platform: Literal["instagram", "x", "youtube", "twitch", "other"]
    label: str = Field(max_length=30)
    url: str = Field(max_length=500)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("El link tiene que empezar con http:// o https://")
        return v


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
    # bio corta, opcional — la propia persona la escribe desde su card
    # (PATCH /cfn/register/me/profile). None si nunca escribió una.
    bio: str | None
    # portada de /perfil — distinta de card_background_url a propósito
    # (ver comentario en el modelo CFNRegistration)
    banner_url: str | None
    # hasta 5 links a redes sociales, en el orden en que la persona los
    # cargó — el frontend dibuja el ícono según platform, ver SocialLink
    social_links: list[SocialLink]
    # foto de fondo de la card — la propia persona la puede subir/cambiar
    # cuando quiera (no solo al registrarse), y staff la puede
    # reemplazar o sacar en cualquier momento. None: el frontend cae al
    # estado por default (sin foto personalizada).
    card_background_url: str | None
    # 0.0 (negro) a 1.0 (blanco), calculado UNA vez al subir — el
    # frontend lo usa para atenuar más la foto cuanto más clara sea, sin
    # cambiar nunca el color del texto. None si nunca se subió una foto,
    # o si se subió antes de que existiera este campo.
    card_background_brightness: float | None
    league_rank: str | None
    league_points: int | None
    master_rating: int | None
    character_name: str | None
    # "Records" — promedios de las últimas 100 partidas (ver
    # get_advanced_stats en cfn_scraper.py), no "estado actual" como el
    # resto de arriba. Todos opcionales: si el scrape de esta sección
    # falló, el resto del perfil sigue funcionando igual.
    drive_impact_received: float | None
    drive_parry_perfect: float | None
    drive_impact_punish_landed: float | None
    corner_time_opponent: float | None
    throws_landed: float | None
    updated_at: datetime | None
    last_error: str | None


class CFNRegistrationCreate(BaseModel):
    cfn_id: str
    avatar_override: str | None = Field(
        default=None, max_length=MAX_ANIMATABLE_DATA_URL_LEN
    )

    @field_validator("cfn_id")
    @classmethod
    def validate_cfn_id(cls, v: str) -> str:
        if not CFN_ID_RE.match(v):
            raise ValueError("El CFN ID debe ser solo números (5 a 20 dígitos)")
        return v

    @field_validator("avatar_override")
    @classmethod
    def validate_avatar(cls, v: str | None) -> str | None:
        return _validate_profile_image(v)


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


class SkillAxis(BaseModel):
    """Un eje del radar de habilidades — el valor crudo del jugador más
    su score normalizado 0-100 para dibujar el radar. La normalización
    es RELATIVA al roster (el valor más alto entre jugadores aprobados
    con perfil = 100, ver get_player_skills), no una escala fija — así
    que el mismo valor crudo puede dar un score distinto si cambia el
    resto del roster. Ambos vienen juntos para que el frontend pueda
    mostrar el número real además de la posición en el radar."""

    key: str
    label: str
    value: float | None
    score: int | None


class MyProfileUpdate(BaseModel):
    """Body de PATCH /cfn/register/me/profile — bio y avatar juntos en
    un solo endpoint porque el frontend los edita en el mismo panel
    ("Editar perfil"). Ambos opcionales de verdad (a diferencia de
    CardBackgroundUpdate, que siempre manda los dos campos juntos):
    mandar bio=None borra la bio, mandar avatar_override=None vuelve al
    avatar de Twitch — pero si un campo no viene en el body, ese campo
    no se toca (ver exclude_unset en el endpoint)."""

    bio: str | None = Field(default=None, max_length=280)
    # a diferencia de bio/avatar/banner, display_name NUNCA puede ser
    # null (columna NOT NULL, se usa como identificador en toda la
    # UI) — Field no alcanza para bloquear un null explícito en el
    # body cuando el tipo es str | None, así que ese caso puntual se
    # valida a mano en el endpoint (ver update_my_profile)
    display_name: str | None = Field(default=None, max_length=40)
    avatar_override: str | None = Field(
        default=None, max_length=MAX_ANIMATABLE_DATA_URL_LEN
    )
    banner_url: str | None = Field(default=None, max_length=MAX_ANIMATABLE_DATA_URL_LEN)
    social_links: list[SocialLink] | None = Field(default=None)

    @field_validator("social_links")
    @classmethod
    def validate_social_links_count(
        cls, v: list[SocialLink] | None
    ) -> list[SocialLink] | None:
        if v is not None and len(v) > 5:
            raise ValueError("Máximo 5 links de redes sociales")
        return v

    @field_validator("avatar_override", "banner_url")
    @classmethod
    def validate_images(cls, v: str | None) -> str | None:
        return _validate_profile_image(v)


class CardBackgroundUpdate(BaseModel):
    """Body para subir/reemplazar la foto de fondo de una card — puede
    ser un GIF animado (ver MAX_ANIMATABLE_DATA_URL_LEN), por eso el
    límite es el generoso, no el de tier list. brightness es opcional
    para no romper si algún cliente viejo no lo manda, pero el frontend
    real siempre lo calcula al subir (ver /jugadores) — para un GIF,
    brightness se calcula sobre el primer frame nada más, es solo una
    aproximación."""

    card_background_url: str = Field(
        min_length=1, max_length=MAX_ANIMATABLE_DATA_URL_LEN
    )
    card_background_brightness: float | None = Field(default=None, ge=0, le=1)

    @field_validator("card_background_url")
    @classmethod
    def validate_card_background(cls, v: str) -> str:
        _validate_profile_image(v)
        return v


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


class UnlinkedCandidate(BaseModel):
    """Sugerencia de cuenta para vincular — solo se arma cuando el
    nombre de usuario de Twitch coincide EXACTO (sin distinguir
    mayúsculas) con el nombre guardado del roster viejo. Nunca una
    sugerencia "parecida" — el riesgo de vincular la cuenta equivocada
    no es solo estético, esa cuenta queda con permiso de editar la card
    (ver PATCH /cfn/register/me/background)."""

    user_id: str
    twitch_username: str
    display_name: str
    avatar_url: str | None


class UnlinkedRegistration(BaseModel):
    """Fila del roster viejo (migrado antes de que existiera el
    auto-registro, ver migración de datos b7e7dd7cf3e5) sin ninguna
    cuenta de Twitch asociada todavía — por eso no tiene avatar real ni
    puede autogestionar su propia foto de fondo."""

    cfn_id: str
    display_name: str
    candidate: UnlinkedCandidate | None


class LinkAccountRequest(BaseModel):
    user_id: str
