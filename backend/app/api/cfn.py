from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CFNProfile
from app.schemas.cfn import CFNProfileRead

router = APIRouter(prefix="/cfn", tags=["cfn"])


@router.get("/players", response_model=list[CFNProfileRead])
def list_cfn_players(db: Annotated[Session, Depends(get_db)]) -> list[CFNProfile]:
    """Público, sin auth. Lee el cache que llena scripts/refresh_cfn.py —
    nunca dispara un scrape en vivo (SPECS.md #12)."""
    return db.query(CFNProfile).all()
