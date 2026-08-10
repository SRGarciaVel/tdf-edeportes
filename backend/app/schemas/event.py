import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.user import UserRead

EventType = Literal["torneo", "stream", "reunion", "otro"]
EventVisibility = Literal["staff", "publico"]


class EventBase(BaseModel):
    title: str
    type: EventType
    start_at: datetime
    end_at: datetime | None = None
    description: str | None = None
    external_url: str | None = None
    visibility: EventVisibility = "staff"

    @field_validator("end_at")
    @classmethod
    def end_after_start(cls, v: datetime | None, info) -> datetime | None:
        start = info.data.get("start_at")
        if v is not None and start is not None and v < start:
            raise ValueError("end_at no puede ser anterior a start_at")
        return v


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    """Todos los campos opcionales — PATCH parcial."""

    title: str | None = None
    type: EventType | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    description: str | None = None
    external_url: str | None = None
    visibility: EventVisibility | None = None


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class EventReadWithCreator(EventRead):
    creator: UserRead
