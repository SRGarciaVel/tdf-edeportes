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
