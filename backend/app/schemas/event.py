import uuid
from datetime import datetime, timedelta, timezone
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
    @field_validator("start_at")
    @classmethod
    def start_not_in_past(cls, v: datetime) -> datetime:
        # margen de 5 min para no romper por latencia de red o reloj
        # levemente desincronizado entre el navegador y el servidor
        now = datetime.now(timezone.utc)
        v_utc = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if v_utc < now - timedelta(minutes=5):
            raise ValueError("No se puede agendar un evento en el pasado")
        return v


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
