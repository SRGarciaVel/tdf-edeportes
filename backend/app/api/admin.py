import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.config import settings
from app.core.database import get_db
from app.models import (
    CFNProfile,
    CFNRegistration,
    InstagramHighlight,
    Notification,
    ProfileComment,
    Role,
    TierList,
    User,
    user_roles,
)
from app.schemas.admin import (
    AdminUserRead,
    DashboardStats,
    RoleCreate,
    RoleRead,
    StaffUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> DashboardStats:
    """Roster + salud técnica en un solo vistazo (pedido de Seba,
    29-08-2026) — todo son counts simples, nada pesado, no hace falta
    cachear esto."""
    return DashboardStats(
        environment=settings.environment,
        total_users=db.query(func.count(User.id)).scalar() or 0,
        staff_count=db.query(func.count(User.id))
        .filter(User.is_staff.is_(True))
        .scalar()
        or 0,
        admin_count=db.query(func.count(User.id))
        .filter(User.is_admin.is_(True))
        .scalar()
        or 0,
        approved_players=db.query(func.count(CFNRegistration.cfn_id))
        .filter(CFNRegistration.status == "approved")
        .scalar()
        or 0,
        pending_registrations=db.query(func.count(CFNRegistration.cfn_id))
        .filter(CFNRegistration.status == "pending")
        .scalar()
        or 0,
        rejected_registrations=db.query(func.count(CFNRegistration.cfn_id))
        .filter(CFNRegistration.status == "rejected")
        .scalar()
        or 0,
        last_cfn_refresh=db.query(func.max(CFNProfile.updated_at)).scalar(),
        total_comments=db.query(func.count(ProfileComment.id)).scalar() or 0,
        total_notifications_sent=db.query(func.count(Notification.id)).scalar() or 0,
        total_tier_lists=db.query(func.count(TierList.id)).scalar() or 0,
        total_instagram_highlights=db.query(func.count(InstagramHighlight.id)).scalar()
        or 0,
    )


@router.get("/users", response_model=list[AdminUserRead])
def list_admin_users(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> list[User]:
    return db.query(User).order_by(User.display_name).all()


@router.patch("/users/{user_id}/staff", response_model=AdminUserRead)
def set_user_staff(
    user_id: uuid.UUID,
    payload: StaffUpdate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> User:
    """Otorga o quita Staff — antes esto SOLO se podía hacer a mano en
    la base (ver SPECS.md #6), ahora también desde acá. is_admin sigue
    sin poder tocarse desde ningún endpoint, a propósito (ver
    require_admin en deps.py)."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Usuario no encontrado")
    user.is_staff = payload.is_staff
    db.commit()
    db.refresh(user)
    return user


@router.get("/roles", response_model=list[RoleRead])
def list_roles(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> list[Role]:
    return db.query(Role).order_by(Role.name).all()


@router.post("/roles", response_model=RoleRead, status_code=201)
def create_role(
    payload: RoleCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> Role:
    existing = db.query(Role).filter(Role.name == payload.name).first()
    if existing is not None:
        raise HTTPException(400, "Ya existe un rol con ese nombre")
    role = Role(name=payload.name)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}", status_code=204)
def delete_role(
    role_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> None:
    """Borra el rol del catálogo entero — se lo saca de CUALQUIER
    usuario que lo tuviera asignado de paso (limpieza explícita de
    user_roles antes de borrar la fila, no depende de un ON DELETE
    CASCADE implícito que nadie más en el proyecto vería declarado)."""
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(404, "Rol no encontrado")
    db.execute(delete(user_roles).where(user_roles.c.role_id == role_id))
    db.delete(role)
    db.commit()


@router.post("/users/{user_id}/roles/{role_id}", status_code=204)
def assign_role(
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> None:
    user = db.get(User, user_id)
    role = db.get(Role, role_id)
    if user is None or role is None:
        raise HTTPException(404, "Usuario o rol no encontrado")
    if role not in user.roles:
        user.roles.append(role)
        db.commit()


@router.delete("/users/{user_id}/roles/{role_id}", status_code=204)
def unassign_role(
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> None:
    user = db.get(User, user_id)
    role = db.get(Role, role_id)
    if user is None or role is None:
        raise HTTPException(404, "Usuario o rol no encontrado")
    if role in user.roles:
        user.roles.remove(role)
        db.commit()
