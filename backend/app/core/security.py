import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_expiration_minutes
    )
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


def create_oauth_state() -> str:
    """Token anti-CSRF para el flujo de Twitch OAuth. Autocontenido (sin
    guardar sesión en el servidor) — el nonce + expiración van firmados
    adentro, así que verificar la firma alcanza para validar."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {"nonce": secrets.token_urlsafe(16), "exp": expire, "purpose": "oauth_state"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def verify_oauth_state(token: str) -> bool:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload.get("purpose") == "oauth_state"
    except JWTError:
        return False
