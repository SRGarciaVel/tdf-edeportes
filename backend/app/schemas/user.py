import uuid

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    twitch_username: str
    display_name: str
    avatar_url: str | None
    is_staff: bool
