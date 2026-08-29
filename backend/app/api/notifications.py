from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated
from app.core.database import get_db
from app.models import Notification, User
from app.schemas.notification import NotificationListResponse, NotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])

# suficiente para el desplegable de la campanita — no es un historial
# completo, si crece más adelante se agrega paginación real recién
# cuando haga falta
MAX_NOTIFICATIONS = 30


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> NotificationListResponse:
    """Últimas MAX_NOTIFICATIONS del usuario logueado, más nuevo
    primero, más el conteo de no leídas (para el numerito de la
    campanita) — separado del length de la lista devuelta porque
    podría haber más no leídas de las que entran en MAX_NOTIFICATIONS."""
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(MAX_NOTIFICATIONS)
        .all()
    )
    unread_count = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .scalar()
    )
    return NotificationListResponse(
        notifications=[
            NotificationRead.model_validate(n, from_attributes=True) for n in rows
        ],
        unread_count=unread_count or 0,
    )


@router.post("/read-all", response_model=NotificationListResponse)
def mark_all_read(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> NotificationListResponse:
    """Marca TODAS las no leídas del usuario de una — no una por una
    (pedido de Seba, 29-08-2026: mismo criterio que Instagram/Facebook,
    se marcan leídas solas al abrir el desplegable, no hace falta
    click individual). Devuelve la lista actualizada para que el
    frontend no tenga que pedirla de nuevo aparte."""
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.read_at.is_(None)
    ).update({"read_at": func.now()})
    db.commit()
    return list_notifications(db, user)
