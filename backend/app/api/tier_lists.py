from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import TierList
from app.schemas.tier_list import TierListCreate, TierListRead

router = APIRouter(prefix="/tierlists", tags=["tierlists"])

# mismo roster que frontend/src/lib/characterColors.ts — mantener
# sincronizados a mano si se agrega/saca un personaje. Se usa acá para
# validar que nadie guarde nombres arbitrarios en un endpoint público sin
# auth (podría usarse para spam/inyectar texto raro en un link compartido).
SF6_ROSTER = {
    "A.K.I.", "Akuma", "Alex", "Blanka", "C. Viper", "Cammy", "Chun-Li",
    "Dee Jay", "Dhalsim", "Ed", "E. Honda", "Elena", "Guile", "Ingrid",
    "Jamie", "JP", "Juri", "Ken", "Kimberly", "Lily", "Luke", "M. Bison",
    "Mai", "Manon", "Marisa", "Rashid", "Ryu", "Sagat", "Terry", "Yasmine",
    "Zangief",
}
THIRD_STRIKE_ROSTER = {
    "Alex", "Chun-Li", "Dudley", "Elena", "Gill", "Hugo", "Ibuki", "Ken",
    "Makoto", "Necro", "Oro", "Q", "Remy", "Ryu", "Sean", "Twelve", "Urien",
    "Yang", "Yun", "Akuma",
}
ROSTERS = {"sf6": SF6_ROSTER, "3s": THIRD_STRIKE_ROSTER}
MAX_TIERS = 12  # límite generoso, solo para evitar payloads gigantes de mala fe
MAX_PER_TIER = 60  # roster más grande (SF6, 31) con margen de sobra


@router.post("", response_model=TierListRead, status_code=201)
def create_tier_list(
    payload: TierListCreate, db: Annotated[Session, Depends(get_db)]
) -> TierList:
    """Público, sin auth — igual que TierMaker, cualquiera arma y comparte
    sin necesitar cuenta. Valida que los nombres sean del roster real del
    juego elegido, para no guardar cualquier texto arbitrario."""
    roster = ROSTERS[payload.game]

    if len(payload.tiers) > MAX_TIERS:
        raise HTTPException(400, f"Máximo {MAX_TIERS} tiers")

    for tier_name, characters in payload.tiers.items():
        if len(characters) > MAX_PER_TIER:
            raise HTTPException(400, f"Demasiados personajes en el tier '{tier_name}'")
        for name in characters:
            if name not in roster:
                raise HTTPException(400, f"'{name}' no es un personaje válido de {payload.game}")

    tier_list = TierList(game=payload.game, tiers=payload.tiers)
    db.add(tier_list)
    db.commit()
    db.refresh(tier_list)
    return tier_list


@router.get("/{tier_list_id}", response_model=TierListRead)
def get_tier_list(tier_list_id: str, db: Annotated[Session, Depends(get_db)]) -> TierList:
    tier_list = db.query(TierList).filter(TierList.id == tier_list_id).first()
    if tier_list is None:
        raise HTTPException(404, "Tier list no encontrada")
    return tier_list
