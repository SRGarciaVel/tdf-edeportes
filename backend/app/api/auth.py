from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated
from app.core.database import get_db
from app.core.security import create_access_token, create_oauth_state, verify_oauth_state
from app.models import User
from app.schemas.auth import TokenResponse, TwitchCallbackRequest, TwitchLoginResponse
from app.schemas.user import UserRead
from app.services.twitch import (
    TwitchAuthError,
    build_authorize_url,
    exchange_code_for_token,
    fetch_twitch_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/twitch/login", response_model=TwitchLoginResponse)
def twitch_login() -> TwitchLoginResponse:
    """El frontend pide esto y redirige al usuario a `authorize_url`.
    Mantiene client_id fuera del bundle del frontend — una sola fuente de
    verdad en el backend."""
    state = create_oauth_state()
    return TwitchLoginResponse(authorize_url=build_authorize_url(state), state=state)


@router.post("/twitch/callback", response_model=TokenResponse)
def twitch_callback(
    payload: TwitchCallbackRequest, db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    if not verify_oauth_state(payload.state):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "state inválido o expirado — reintentar el login"
        )

    try:
        access_token = exchange_code_for_token(payload.code)
        twitch_user = fetch_twitch_user(access_token)
    except TwitchAuthError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    user = db.query(User).filter(User.twitch_id == twitch_user["id"]).first()
    if user is None:
        # usuario nuevo: is_staff siempre False acá — se otorga a mano
        # (seed inicial o un staff existente lo promueve), nunca por
        # auto-registro (SPECS.md §6)
        user = User(
            twitch_id=twitch_user["id"],
            twitch_username=twitch_user["login"],
            display_name=twitch_user["display_name"],
            avatar_url=twitch_user.get("profile_image_url"),
            is_staff=False,
        )
        db.add(user)
    else:
        # usuario existente: refrescar datos de perfil, nunca is_staff
        user.twitch_username = twitch_user["login"]
        user.display_name = twitch_user["display_name"]
        user.avatar_url = twitch_user.get("profile_image_url")

    db.commit()
    db.refresh(user)

    session_token = create_access_token(user.id)
    return TokenResponse(access_token=session_token, user=user)


@router.get("/me", response_model=UserRead)
def me(user: Annotated[User, Depends(require_authenticated)]) -> User:
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    """El JWT es stateless — no hay nada que invalidar server-side todavía
    (sin blacklist ni Redis en esta fase). El frontend simplemente descarta
    el token guardado. Este endpoint existe por simetría de API y como
    punto de extensión si más adelante se agrega blacklist."""
    return None
