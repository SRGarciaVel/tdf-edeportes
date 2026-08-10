import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_staff
from app.core.database import get_db
from app.models import QuarterlyGoal, User
from app.schemas.goal import GoalCreate, GoalRead, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalRead])
def list_goals(
    db: Annotated[Session, Depends(get_db)],
    year: int | None = None,
    quarter: int | None = None,
) -> list[QuarterlyGoal]:
    """Público — sin auth. No hay noción de visibility acá, a diferencia de
    events: los objetivos del club son siempre públicos por diseño."""
    query = db.query(QuarterlyGoal)
    if year is not None:
        query = query.filter(QuarterlyGoal.year == year)
    if quarter is not None:
        query = query.filter(QuarterlyGoal.quarter == quarter)
    return query.order_by(QuarterlyGoal.year, QuarterlyGoal.quarter).all()


@router.post("", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    db: Annotated[Session, Depends(get_db)],
    staff_user: Annotated[User, Depends(require_staff)],
) -> QuarterlyGoal:
    goal = QuarterlyGoal(**payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.patch("/{goal_id}", response_model=GoalRead)
def update_goal(
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    db: Annotated[Session, Depends(get_db)],
    staff_user: Annotated[User, Depends(require_staff)],
) -> QuarterlyGoal:
    goal = db.get(QuarterlyGoal, goal_id)
    if goal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Objetivo no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    staff_user: Annotated[User, Depends(require_staff)],
) -> None:
    # no estaba en el borrador original de SPECS.md §7 (solo GET/POST/PATCH),
    # agregado por simetría con /events — el staff va a necesitar borrar
    # objetivos mal cargados tarde o temprano
    goal = db.get(QuarterlyGoal, goal_id)
    if goal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Objetivo no encontrado")
    db.delete(goal)
    db.commit()
