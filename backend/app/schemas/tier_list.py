import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Game = Literal["sf6", "3s"]


class TierListCreate(BaseModel):
    game: Game
    # {"S": ["Jamie", "Ryu"], "A": [...], ...} — se valida en el endpoint
    # que los nombres pertenezcan al roster del juego elegido
    tiers: dict[str, list[str]] = Field(default_factory=dict)


class TierListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    game: Game
    tiers: dict[str, list[str]]
    created_at: datetime
