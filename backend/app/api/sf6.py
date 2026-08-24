from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import SF6MetaSnapshot, SF6PatchNote
from app.services.sf6_meta import SNAPSHOT_TYPES

router = APIRouter(prefix="/sf6", tags=["sf6"])

SnapshotType = Literal["usagerate", "usagerate_master", "dia", "dia_master"]


class MetaSnapshotRead(BaseModel):
    snapshot_type: str
    month: str
    data: dict


@router.get("/meta/{snapshot_type}", response_model=MetaSnapshotRead)
def get_meta_snapshot(
    snapshot_type: SnapshotType, db: Annotated[Session, Depends(get_db)]
) -> SF6MetaSnapshot:
    """Meta actual de SF6 — datos globales de Capcom (uso de personajes
    o diagrama de matchups, overall o solo rango Master), no específico
    de TDF. Público, sin auth, mismo criterio que /cfn/players — lee
    directo el cache que llena scripts/refresh_sf6_meta.py, nunca
    dispara un fetch en vivo."""
    row = (
        db.query(SF6MetaSnapshot)
        .filter(SF6MetaSnapshot.snapshot_type == snapshot_type)
        .order_by(SF6MetaSnapshot.month.desc())
        .first()
    )
    if row is None:
        raise HTTPException(
            404,
            f"Todavía no hay datos guardados para {snapshot_type} — "
            "el cron mensual no corrió todavía o falló",
        )
    return row


@router.get("/meta", response_model=list[str])
def list_snapshot_types() -> list[str]:
    """Los 4 tipos válidos, para que el frontend no los tenga que
    hardcodear en dos lugares distintos."""
    return SNAPSHOT_TYPES


class PatchNoteRead(BaseModel):
    patch_id: str
    title: str
    data: dict


@router.get("/patch-notes/latest", response_model=PatchNoteRead)
def get_latest_patch_note(db: Annotated[Session, Depends(get_db)]) -> SF6PatchNote:
    """El parche de SF6 más reciente que tengamos guardado — no dispara
    un fetch en vivo, lee directo el cache que llena
    scripts/refresh_sf6_patch_notes.py (mismo criterio que el resto de
    /sf6). A diferencia de Meta Actual, esto no corre por cron
    automático — se runea a mano cuando Seba se entera de un parche
    nuevo, así que "más reciente que tengamos guardado" no siempre es
    literalmente el último parche real de Capcom."""
    row = db.query(SF6PatchNote).order_by(SF6PatchNote.patch_id.desc()).first()
    if row is None:
        raise HTTPException(
            404,
            "Todavía no hay ninguna nota de parche guardada — el script "
            "de refresco no corrió todavía",
        )
    return row


@router.get("/patch-notes", response_model=list[PatchNoteRead])
def list_patch_notes(db: Annotated[Session, Depends(get_db)]) -> list[SF6PatchNote]:
    """Historial de parches guardados, más reciente primero — pensado
    para un índice navegable, no trae el detalle completo de cada uno
    (el campo `data` sí viaja completo por ahora, dado que no hay
    tantos parches guardados como para que pese; si en el futuro esto
    crece mucho, separar en un endpoint "resumen" liviano)."""
    return db.query(SF6PatchNote).order_by(SF6PatchNote.patch_id.desc()).all()
