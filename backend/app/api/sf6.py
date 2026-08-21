from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import SF6MetaSnapshot
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
