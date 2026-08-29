from fastapi import APIRouter
from pydantic import BaseModel

from app.services.twitch import get_friends_live_status, get_live_status

router = APIRouter(prefix="/twitch", tags=["twitch"])


class LiveStatusRead(BaseModel):
    is_live: bool
    title: str | None
    viewer_count: int | None


class ChannelLiveStatus(LiveStatusRead):
    channel: str


@router.get("/live-status", response_model=LiveStatusRead)
def read_live_status() -> dict:
    """Estado real del canal de TDF — público, sin auth. Cacheado en
    memoria del lado del servicio (ver get_live_status), así que pedirlo
    seguido desde el frontend (el navbar/hero lo consultan cada tanto)
    no le pega directo a Twitch en cada request."""
    return get_live_status()


@router.get("/friends-live-status", response_model=list[ChannelLiveStatus])
def read_friends_live_status() -> list[dict]:
    """Estado de Younghou y Pochoclo23 — público, sin auth (pedido de
    Seba, 29-08-2026, ver FRIEND_TWITCH_LOGINS en services/twitch.py).
    Un solo request a Twitch para los dos, no dos por separado."""
    return get_friends_live_status()
