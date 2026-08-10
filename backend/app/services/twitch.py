from urllib.parse import urlencode

import httpx

from app.core.config import settings

AUTHORIZE_URL = "https://id.twitch.tv/oauth2/authorize"
TOKEN_URL = "https://id.twitch.tv/oauth2/token"
USERS_URL = "https://api.twitch.tv/helix/users"

SCOPES = "user:read:email"


class TwitchAuthError(Exception):
    """Cualquier fallo al hablar con la API de Twitch (code inválido,
    Twitch caído, respuesta inesperada)."""


def build_authorize_url(state: str) -> str:
    params = {
        "client_id": settings.twitch_client_id,
        "redirect_uri": settings.twitch_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code_for_token(code: str) -> str:
    """Intercambia el authorization code por un access_token de Twitch."""
    try:
        response = httpx.post(
            TOKEN_URL,
            data={
                "client_id": settings.twitch_client_id,
                "client_secret": settings.twitch_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.twitch_redirect_uri,
            },
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise TwitchAuthError(f"No se pudo intercambiar el code: {exc}") from exc

    data = response.json()
    access_token = data.get("access_token")
    if not access_token:
        raise TwitchAuthError("Twitch no devolvió access_token")
    return access_token


def fetch_twitch_user(access_token: str) -> dict:
    """Devuelve el perfil del usuario dueño del access_token."""
    try:
        response = httpx.get(
            USERS_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Client-Id": settings.twitch_client_id,
            },
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise TwitchAuthError(f"No se pudo consultar el usuario: {exc}") from exc

    users = response.json().get("data", [])
    if not users:
        raise TwitchAuthError("Twitch no devolvió datos de usuario")
    return users[0]
