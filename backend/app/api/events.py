import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_staff
from app.core.database import get_db
from app.models import Event, EventComment, User
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.event import EventCreate, EventRead, EventUpdate
from app.services.discord import notify_event_change

router = APIRouter(prefix="/events", tags=["events"])


def _get_event_or_404(db: Session, event_id: uuid.UUID) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evento no encontrado")
    return event


@router.get("", response_model=list[EventRead])
def list_events(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user)],
) -> list[Event]:
    query = db.query(Event)
    # sin sesión o sin staff: solo lo visible al público (SPECS.md §4)
    if user is None or not user.is_staff:
        query = query.filter(Event.visibility == "publico")
    return query.order_by(Event.start_at).all()


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    db: Annotated[Session, Depends(get_db)],
    staff_user: Annotated[User, Depends(require_staff)],
) -> Event:
    event = Event(**payload.model_dump(), created_by=staff_user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    notify_event_change(event, "creado")
    return event


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user)],
) -> Event:
    event = _get_event_or_404(db, event_id)
    if event.visibility != "publico" and (user is None or not user.is_staff):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evento no encontrado")
    return event


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: Annotated[Session, Depends(get_db)],
    staff_user: Annotated[User, Depends(require_staff)],
) -> Event:
    event = _get_event_or_404(db, event_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    notify_event_change(event, "modificado")
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    staff_user: Annotated[User, Depends(require_staff)],
) -> None:
    event = _get_event_or_404(db, event_id)
    db.delete(event)
    db.commit()


@router.get("/{event_id}/comments", response_model=list[CommentRead])
def list_comments(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    staff_user: Annotated[User, Depends(require_staff)],
) -> list[EventComment]:
    _get_event_or_404(db, event_id)
    return (
        db.query(EventComment)
        .filter(EventComment.event_id == event_id)
        .order_by(EventComment.created_at)
        .all()
    )


@router.post(
    "/{event_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED
)
def create_comment(
    event_id: uuid.UUID,
    payload: CommentCreate,
    db: Annotated[Session, Depends(get_db)],
    staff_user: Annotated[User, Depends(require_staff)],
) -> EventComment:
    _get_event_or_404(db, event_id)
    comment = EventComment(event_id=event_id, user_id=staff_user.id, body=payload.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
