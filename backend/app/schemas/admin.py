import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class AdminUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    twitch_username: str
    display_name: str
    avatar_url: str | None
    is_staff: bool
    is_admin: bool
    roles: list[RoleRead]


class StaffUpdate(BaseModel):
    is_staff: bool


class DashboardStats(BaseModel):
    """Lo "fundamental" que Seba pidió ver de entrada (29-08-2026):
    roster + salud técnica juntos en el mismo panel, no separados en
    pestañas — así se lee todo de un vistazo al entrar."""

    environment: str
    total_users: int
    staff_count: int
    admin_count: int
    approved_players: int
    pending_registrations: int
    rejected_registrations: int
    last_cfn_refresh: datetime | None
    total_comments: int
    total_notifications_sent: int
    total_tier_lists: int
    total_instagram_highlights: int
