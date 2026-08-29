import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_authenticated
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import CFNRegistration, Notification, ProfileComment, User
from app.schemas.profile_comment import (
    CommentAuthor,
    ProfileCommentCreate,
    ProfileCommentRead,
    RecentCommentEntry,
)

router = APIRouter(prefix="/profiles", tags=["profile_comments"])

# cuántos entran en la sección de actividad reciente del Home — mismo
# tamaño que ya usa esa sección para "La comunidad" (6, en
# HomePage.tsx), así los dos grids del Home se sienten parejos
RECENT_COMMENTS_LIMIT = 6


@router.get("/recent-comments", response_model=list[RecentCommentEntry])
def list_recent_comments(
    db: Annotated[Session, Depends(get_db)],
) -> list[RecentCommentEntry]:
    """Últimos comentarios de TODO el sitio (no de un perfil puntual,
    a diferencia de list_profile_comments) — para la sección de
    actividad reciente en Home (pedido de Seba, 29-08-2026). Público,
    sin auth: no expone nada que no sea ya público en el perfil de
    origen, esto solo los junta en un solo lugar.

    Ruta fija "/recent-comments" bajo el mismo prefix "/profiles" que
    "/{cfn_id}/comments" — sin choque de rutas porque tienen distinta
    cantidad de segmentos (FastAPI las distingue por forma, no
    importa el orden de declaración acá)."""
    rows = (
        db.query(ProfileComment, User, CFNRegistration)
        .join(User, User.id == ProfileComment.author_user_id)
        .join(CFNRegistration, CFNRegistration.cfn_id == ProfileComment.cfn_id)
        .order_by(ProfileComment.created_at.desc())
        .limit(RECENT_COMMENTS_LIMIT)
        .all()
    )
    return [
        RecentCommentEntry(
            id=comment.id,
            body=comment.body,
            created_at=comment.created_at,
            author=CommentAuthor(
                user_id=author.id,
                display_name=author.display_name,
                avatar_url=author.avatar_url,
            ),
            profile_cfn_id=reg.cfn_id,
            profile_display_name=reg.display_name,
        )
        for comment, author, reg in rows
    ]


def _get_approved_cfn_id(db: Session, cfn_id: str) -> CFNRegistration:
    """Mismo guard que _get_approved_registration en cfn.py, repetido
    acá para no crear una dependencia cruzada entre routers por una
    sola función de 4 líneas — no vale la pena el acoplamiento."""
    registration = (
        db.query(CFNRegistration)
        .filter(CFNRegistration.cfn_id == cfn_id, CFNRegistration.status == "approved")
        .first()
    )
    if registration is None:
        raise HTTPException(404, "Jugador no encontrado")
    return registration


def _to_read(
    comment: ProfileComment,
    author: User,
    viewer: User | None,
    profile_owner_user_id: uuid.UUID | None,
) -> ProfileCommentRead:
    can_delete = viewer is not None and (
        viewer.is_staff
        or viewer.id == comment.author_user_id
        or viewer.id == profile_owner_user_id
    )
    return ProfileCommentRead(
        id=comment.id,
        cfn_id=comment.cfn_id,
        body=comment.body,
        created_at=comment.created_at,
        author=CommentAuthor(
            user_id=author.id,
            display_name=author.display_name,
            avatar_url=author.avatar_url,
        ),
        can_delete=can_delete,
    )


@router.get("/{cfn_id}/comments", response_model=list[ProfileCommentRead])
def list_profile_comments(
    cfn_id: str,
    db: Annotated[Session, Depends(get_db)],
    viewer: Annotated[User | None, Depends(get_current_user)],
) -> list[ProfileCommentRead]:
    """Público, auth opcional — auth solo importa para calcular
    can_delete por comentario (ver _to_read), no para poder ver la
    lista. Más nuevo primero, mismo orden que el Steam de referencia."""
    registration = _get_approved_cfn_id(db, cfn_id)
    rows = (
        db.query(ProfileComment, User)
        .join(User, User.id == ProfileComment.author_user_id)
        .filter(ProfileComment.cfn_id == cfn_id)
        .order_by(ProfileComment.created_at.desc())
        .all()
    )
    return [
        _to_read(comment, author, viewer, registration.user_id)
        for comment, author in rows
    ]


@router.post("/{cfn_id}/comments", response_model=ProfileCommentRead, status_code=201)
@limiter.limit("20/hour")
def create_profile_comment(
    request: Request,
    cfn_id: str,
    payload: ProfileCommentCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> ProfileCommentRead:
    """Cualquier persona logueada con Twitch puede comentar en
    CUALQUIER perfil aprobado, esté o no ella misma en el roster —
    decisión explícita de Seba (29-08-2026), a diferencia del resto de
    /cfn que requiere estar en el roster para auto-gestionar algo.

    Límite propio de 20/hora (default del sitio es 300/hora, ver
    limiter.py) — auditoría de seguridad 29-08-2026: sin esto, una
    cuenta logueada podía inundar el perfil de cualquiera con
    comentarios repetidos a un ritmo mucho más alto que lo que
    cualquier persona real escribiría."""
    registration = _get_approved_cfn_id(db, cfn_id)
    body = payload.body.strip()
    if not body:
        raise HTTPException(422, "El comentario no puede estar vacío")
    comment = ProfileComment(cfn_id=cfn_id, author_user_id=user.id, body=body)
    db.add(comment)
    db.flush()  # necesitamos comment.id para el payload de la notificación

    # notifica al dueño del perfil — nunca a uno mismo si comenta su
    # propia página, y nunca si el perfil es del roster viejo sin
    # cuenta de Twitch vinculada (registration.user_id es None ahí)
    if registration.user_id is not None and registration.user_id != user.id:
        db.add(
            Notification(
                user_id=registration.user_id,
                type="comment_received",
                payload={
                    "comment_id": str(comment.id),
                    "cfn_id": cfn_id,
                    "author_display_name": user.display_name,
                    "author_avatar_url": user.avatar_url,
                    "body_preview": body[:80],
                },
            )
        )

    db.commit()
    db.refresh(comment)
    return _to_read(comment, user, user, registration.user_id)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_profile_comment(
    comment_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> None:
    """Puede borrar: quien lo escribió, el dueño del perfil comentado,
    o staff (decisión de Seba, 29-08-2026) — mismo criterio de "quién
    puede borrar su propia pared" que Steam."""
    comment = db.get(ProfileComment, comment_id)
    if comment is None:
        raise HTTPException(404, "Comentario no encontrado")
    registration = (
        db.query(CFNRegistration)
        .filter(CFNRegistration.cfn_id == comment.cfn_id)
        .first()
    )
    profile_owner_user_id = registration.user_id if registration else None
    can_delete = (
        user.is_staff
        or user.id == comment.author_user_id
        or user.id == profile_owner_user_id
    )
    if not can_delete:
        raise HTTPException(403, "No puedes borrar este comentario")
    db.delete(comment)
    db.commit()
