from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User

# auto_error=False para poder distinguir "sin token" (usuario público) de
# "token inválido" en los endpoints donde el login es opcional
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    """Usuario autenticado, o None si no vino token (acceso público)."""
    if credentials is None:
        return None

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado"
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado"
        )
    return user


def require_staff(
    user: Annotated[User | None, Depends(get_current_user)],
) -> User:
    """Guard para endpoints de escritura. Regla única de SPECS.md §4:
    autenticado + is_staff, sin matriz de permisos por rol."""
    if user is None or not user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere ser parte del staff del club",
        )
    return user


def require_authenticated(
    user: Annotated[User | None, Depends(get_current_user)],
) -> User:
    """Para endpoints que solo requieren estar logueado (cualquier usuario
    con cuenta de Twitch vinculada), no necesariamente staff."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado"
        )
    return user


def require_admin(
    user: Annotated[User | None, Depends(get_current_user)],
) -> User:
    """Nivel por encima de Staff — pedido de Seba (29-08-2026): panel de
    Administración accesible SOLO para AckermanFG y bazthyfreeman.
    is_admin se asigna a mano en la base, nunca desde ningún endpoint
    (ni siquiera los del propio panel de Administración pueden
    otorgarlo — ver admin.py, esa línea no se cruza)."""
    if user is None or not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere ser administrador del sitio",
        )
    return user
