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
