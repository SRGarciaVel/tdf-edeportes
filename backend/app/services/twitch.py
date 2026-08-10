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
    except httpx.HTTPStatusError as exc:
        # Twitch manda el motivo real en el body (invalid code, redirect_uri
        # mismatch, etc.) — lo propagamos en vez de esconderlo detrás del
        # status HTTP genérico, si no es imposible debuggear desde afuera.
        raise TwitchAuthError(
            f"Twitch rechazó el intercambio ({exc.response.status_code}): {exc.response.text}"
        ) from exc
    except httpx.HTTPError as exc:
        raise TwitchAuthError(f"No se pudo contactar a Twitch: {exc}") from exc

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
    except httpx.HTTPStatusError as exc:
        raise TwitchAuthError(
            f"Twitch rechazó la consulta de usuario ({exc.response.status_code}): {exc.response.text}"
        ) from exc
    except httpx.HTTPError as exc:
        raise TwitchAuthError(f"No se pudo contactar a Twitch: {exc}") from exc

    users = response.json().get("data", [])
    if not users:
        raise TwitchAuthError("Twitch no devolvió datos de usuario")
    return users[0]


def get_app_access_token() -> str:
    """Token de aplicación (client credentials) — no requiere que ningún
    usuario haga login. Sirve para consultar datos públicos de Twitch, como
    resolver usernames a IDs para el seed de staff."""
    try:
        response = httpx.post(
            TOKEN_URL,
            data={
                "client_id": settings.twitch_client_id,
                "client_secret": settings.twitch_client_secret,
                "grant_type": "client_credentials",
            },
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise TwitchAuthError(
            f"Twitch rechazó el pedido de app token ({exc.response.status_code}): {exc.response.text}"
        ) from exc
    except httpx.HTTPError as exc:
        raise TwitchAuthError(f"No se pudo contactar a Twitch: {exc}") from exc

    token = response.json().get("access_token")
    if not token:
        raise TwitchAuthError("Twitch no devolvió access_token de aplicación")
    return token


def fetch_users_by_login(logins: list[str], app_token: str) -> list[dict]:
    """Resuelve hasta 100 usernames a sus perfiles completos (incluye el id
    numérico de Twitch) en un solo request. Usernames que no existen se
    omiten silenciosamente en la respuesta de Twitch — quien llama debe
    comparar cuántos pidió contra cuántos volvieron."""
    if len(logins) > 100:
        raise ValueError("Twitch permite un máximo de 100 logins por request")
    try:
        response = httpx.get(
            USERS_URL,
            params=[("login", login) for login in logins],
            headers={
                "Authorization": f"Bearer {app_token}",
                "Client-Id": settings.twitch_client_id,
            },
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise TwitchAuthError(
            f"Twitch rechazó la consulta ({exc.response.status_code}): {exc.response.text}"
        ) from exc
    except httpx.HTTPError as exc:
        raise TwitchAuthError(f"No se pudo contactar a Twitch: {exc}") from exc

    return response.json().get("data", [])
