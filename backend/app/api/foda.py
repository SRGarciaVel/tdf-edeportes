import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_authenticated
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import FodaEntry, User
from app.schemas.foda_entry import FodaEntryCreate, FodaEntryRead

router = APIRouter(prefix="/foda", tags=["foda"])

# suficiente para la actividad puntual que la motivó — se agrega
# paginación real el día que de verdad haga falta, no antes (mismo
# criterio que MAX_HIGHLIGHTS_LISTED en highlights.py)
MAX_LISTED = 200


def _to_read(entry: FodaEntry, viewer: User | None) -> FodaEntryRead:
    can_delete = viewer is not None and (
        viewer.is_staff
        or (entry.created_by is not None and entry.created_by == viewer.id)
    )
    return FodaEntryRead(
        id=entry.id,
        subject_name=entry.subject_name,
        author_name=entry.author_name,
        fortalezas=entry.fortalezas,
        oportunidades=entry.oportunidades,
        debilidades=entry.debilidades,
        amenazas=entry.amenazas,
        created_at=entry.created_at,
        can_delete=can_delete,
    )


@router.get("", response_model=list[FodaEntryRead])
def list_foda(
    db: Annotated[Session, Depends(get_db)],
    viewer: Annotated[User | None, Depends(get_current_user)],
) -> list[FodaEntryRead]:
    """Público, auth opcional — auth solo importa para calcular
    can_delete, no para poder ver la lista. Más nuevo primero."""
    entries = (
        db.query(FodaEntry)
        .order_by(FodaEntry.created_at.desc())
        .limit(MAX_LISTED)
        .all()
    )
    return [_to_read(e, viewer) for e in entries]


@router.post("", response_model=FodaEntryRead, status_code=201)
# límite más estricto que el default de la app (300/hora) porque este
# es de los pocos endpoints de escritura que no exige ninguna cuenta —
# mismo criterio que create_tier_list (informe de seguridad
# 18-08-2026, hallazgo #6)
@limiter.limit("20/hour")
def create_foda(
    request: Request,
    payload: FodaEntryCreate,
    db: Annotated[Session, Depends(get_db)],
    # sin auth requerida a propósito — mandar un FODA es libre para
    # cualquiera, mismo criterio que ranquear una tier list ya
    # existente (TierMaker). Si está logueado, el nombre se resuelve
    # solo; si no, usa el que escribió a mano.
    user: Annotated[User | None, Depends(get_current_user)],
) -> FodaEntryRead:
    if user is not None:
        author_name = user.display_name
    else:
        raw_name = (payload.author_name or "").strip()
        author_name = raw_name[:40] if raw_name else "Anónimo"

    entry = FodaEntry(
        subject_name=payload.subject_name.strip(),
        created_by=user.id if user is not None else None,
        author_name=author_name,
        fortalezas=payload.fortalezas.strip(),
        oportunidades=payload.oportunidades.strip(),
        debilidades=payload.debilidades.strip(),
        amenazas=payload.amenazas.strip(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _to_read(entry, user)


@router.delete("/{entry_id}", status_code=204)
def delete_foda(
    entry_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_authenticated)],
) -> None:
    """Puede borrarla quien la mandó (si estaba logueado, ver
    created_by) O cualquier staff — mismo criterio exacto que
    delete_tier_list. Las mandadas por invitados sin sesión
    (created_by null) solo las puede borrar staff, no hay forma de
    verificar que un invitado sea "el mismo" que la mandó."""
    entry = db.get(FodaEntry, entry_id)
    if entry is None:
        raise HTTPException(404, "Entrada de FODA no encontrada")
    if entry.created_by != user.id and not user.is_staff:
        raise HTTPException(403, "No puedes borrar esta entrada")
    db.delete(entry)
    db.commit()
