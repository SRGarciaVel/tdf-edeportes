from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CFNProfile, CFNRegistration, User
from app.schemas.achievement import (
    AchievementLeaderboardEntry,
    AchievementRead,
    PlayerAchievements,
)
from app.services.achievements import (
    ACHIEVEMENTS_CATALOG,
    RARITY_AP,
    compute_achievements,
    total_ap,
)

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("/leaderboard", response_model=list[AchievementLeaderboardEntry])
def get_achievements_leaderboard(
    db: Annotated[Session, Depends(get_db)],
) -> list[AchievementLeaderboardEntry]:
    """Público, sin auth. Ruta fija declarada ANTES que /{cfn_id} acá
    abajo a propósito — con el mismo largo de un solo segmento,
    FastAPI matchearía "leaderboard" como si fuera un cfn_id si el
    orden fuera al revés (a diferencia de /profiles/recent-comments,
    que no chocaba por tener distinta cantidad de segmentos)."""
    rows = (
        db.query(CFNRegistration, CFNProfile, User)
        .filter(CFNRegistration.status == "approved")
        .outerjoin(CFNProfile, CFNProfile.cfn_id == CFNRegistration.cfn_id)
        .outerjoin(User, User.id == CFNRegistration.user_id)
        .all()
    )
    unlocked_by_cfn = compute_achievements(db)

    entries = [
        AchievementLeaderboardEntry(
            cfn_id=reg.cfn_id,
            display_name=reg.display_name,
            avatar_url=reg.avatar_override or (user.avatar_url if user else None),
            total_ap=total_ap(unlocked_by_cfn.get(reg.cfn_id, set())),
            master_rating=profile.master_rating if profile else None,
        )
        for reg, profile, user in rows
    ]
    # empate por AP -> desempata el MR más alto (0/None al final)
    entries.sort(key=lambda e: (e.total_ap, e.master_rating or -1), reverse=True)
    return entries


@router.get("/{cfn_id}", response_model=PlayerAchievements)
def get_player_achievements(
    cfn_id: str, db: Annotated[Session, Depends(get_db)]
) -> PlayerAchievements:
    """Público, sin auth — mismo criterio que el resto de /cfn."""
    exists = (
        db.query(CFNRegistration.cfn_id)
        .filter(CFNRegistration.cfn_id == cfn_id, CFNRegistration.status == "approved")
        .first()
    )
    if exists is None:
        raise HTTPException(404, "Jugador no encontrado")

    unlocked_ids = compute_achievements(db).get(cfn_id, set())
    achievements = [
        AchievementRead(
            id=a["id"],
            name=a["name"],
            description=a["description"],
            rarity=a["rarity"],
            ap=RARITY_AP[a["rarity"]],
            unlocked=a["id"] in unlocked_ids,
        )
        for a in ACHIEVEMENTS_CATALOG
    ]
    return PlayerAchievements(
        cfn_id=cfn_id, total_ap=total_ap(unlocked_ids), achievements=achievements
    )
