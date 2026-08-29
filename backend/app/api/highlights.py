import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_staff
from app.core.database import get_db
from app.models import InstagramHighlight, User
from app.schemas.instagram_highlight import HighlightCreate, HighlightRead

router = APIRouter(prefix="/highlights", tags=["highlights"])

# tope defensivo simple — no hay paginación todavía porque no hace
# falta (suben "cada tanto", palabras de Seba), se agrega el día que
# de verdad se acumulen más que esto (ver CODESTYLE.md "elegancia
# sobre parches", mismo criterio que MAX_TIER_LISTS_LISTED en
# tier_lists.py)
MAX_HIGHLIGHTS_LISTED = 100


@router.get("", response_model=list[HighlightRead])
def list_highlights(
    db: Annotated[Session, Depends(get_db)],
) -> list[InstagramHighlight]:
    """Público, sin auth — más nueva primero. El Home muestra solo las
    2 más recientes (recorte del lado del frontend, mismo criterio que
    ya usa para "La comunidad"), /recopilaciones muestra todas."""
    return (
        db.query(InstagramHighlight)
        .order_by(InstagramHighlight.created_at.desc())
        .limit(MAX_HIGHLIGHTS_LISTED)
        .all()
    )


@router.post("", response_model=HighlightRead, status_code=201)
def create_highlight(
    payload: HighlightCreate,
    db: Annotated[Session, Depends(get_db)],
    staff: Annotated[User, Depends(require_staff)],
) -> InstagramHighlight:
    """Solo staff puede agregar — es contenido curado a mano, no algo
    que cualquiera suba (a diferencia de, por ejemplo, los comentarios
    de perfil)."""
    highlight = InstagramHighlight(url=payload.url, added_by=staff.id)
    db.add(highlight)
    db.commit()
    db.refresh(highlight)
    return highlight


@router.delete("/{highlight_id}", status_code=204)
def delete_highlight(
    highlight_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    _staff: Annotated[User, Depends(require_staff)],
) -> None:
    highlight = db.get(InstagramHighlight, highlight_id)
    if highlight is None:
        raise HTTPException(404, "Recopilación no encontrada")
    db.delete(highlight)
    db.commit()
