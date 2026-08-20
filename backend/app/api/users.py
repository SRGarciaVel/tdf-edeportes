from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import require_staff
from app.core.database import get_db
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])


class UserSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    twitch_username: str
    display_name: str
    avatar_url: str | None


@router.get("/search", response_model=list[UserSearchResult])
def search_users(
    db: Annotated[Session, Depends(get_db)],
    _staff: Annotated[User, Depends(require_staff)],
    q: Annotated[str, Query(min_length=2, max_length=50)],
) -> list[User]:
    """Búsqueda de cuentas — solo staff. Pensada para cuando hace falta
    encontrar a alguien a mano (ej. vincular una cuenta de Twitch al
    roster viejo de CFN cuando el nombre no calza exacto, ver
    GET /cfn/registrations/unlinked). Busca por nombre de usuario O
    nombre para mostrar, sin distinguir mayúsculas."""
    pattern = f"%{q}%"
    return (
        db.query(User)
        .filter(
            or_(
                User.twitch_username.ilike(pattern),
                User.display_name.ilike(pattern),
            )
        )
        .order_by(User.display_name)
        .limit(20)
        .all()
    )
