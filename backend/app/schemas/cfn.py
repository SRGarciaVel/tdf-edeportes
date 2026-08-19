from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
