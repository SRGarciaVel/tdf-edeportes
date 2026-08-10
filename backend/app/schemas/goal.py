import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

GoalStatus = Literal["en_progreso", "cumplido", "descartado"]


class GoalBase(BaseModel):
    quarter: int = Field(ge=1, le=4)
    year: int = Field(ge=2020, le=2100)
    title: str
    description: str | None = None
    status: GoalStatus = "en_progreso"


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    quarter: int | None = Field(default=None, ge=1, le=4)
    year: int | None = Field(default=None, ge=2020, le=2100)
    title: str | None = None
    description: str | None = None
    status: GoalStatus | None = None


class GoalRead(GoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
