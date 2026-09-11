from datetime import datetime, timezone
from typing import TypedDict

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.api.cfn import SKILL_CATEGORIES
from app.models import (
    CFNMatch,
    CFNProfile,
    CFNRegistration,
    FodaEntry,
    ProfileComment,
    TierListTemplate,
)

# AP por rareza — mismo esquema de 4 niveles que se conversó con Seba
# (06-09-2026), inspirado en el lore de Street Fighter. No es una tabla
# en la base porque el catálogo es contenido curado a mano, no datos de
# usuario — mismo criterio que SKILL_CATEGORIES en api/cfn.py.
RARITY_AP = {
    "raza": 10,
    "ansatsuken": 25,
    "psycho_power": 50,
    "satsui_no_hado": 100,
}

# piso de partidas para entrar a los leaderboards de Records — MISMO
# valor que ya usa el frontend (MIN_MATCHES_FOR_RECORDS en
# JugadoresPage.tsx) para decidir quién puede "ganar" un leaderboard
# público. Si ese número cambia allá, hay que actualizarlo acá también
# (no hay una única fuente de verdad compartida todavía).
MIN_MATCHES_FOR_RECORDS = 20

# 1800 MR = Ultimate Master, umbral REAL del juego (confirmado por Seba
# con captura del propio SF6, 06-09-2026) — nunca un número inventado.
ULTIMATE_MASTER_MR = 1800

WIN_STREAK_TARGET = 10
MATCHES_TARGET_GUARDIAN = 50
MIN_MATCHES_FOR_WINRATE_ACHIEVEMENT = 30
WINRATE_TARGET = 0.65
MEMBER_MONTHS_TARGET = 6


class AchievementDef(TypedDict):
    id: str
    name: str
    description: str
    rarity: str


# Catálogo v1 (06-09-2026) — deliberadamente NO incluye "Polifacético"
# (3+ personajes en Master, necesita scrapear la pestaña "Master Rate
# (Per Character)" de Buckler's, todavía no implementado) ni ningún
# logro atado al rango de texto "Legend" (depende de la posición en el
# top 500 dinámico, no de un número de MR fijo — habría que scrapear
# la tabla de ranking completa, no solo el perfil). "El Trono del
# Dojo" cumple el rol del tier más alto usando SOLO datos que ya
# capturamos hoy (master_rating), sin fingir que es lo mismo que el
# rango Legend real del juego.
ACHIEVEMENTS_CATALOG: list[AchievementDef] = [
    {
        "id": "espiritu_inquebrantable",
        "name": "Espíritu Inquebrantable",
        "description": f"Sé miembro de la comunidad desde hace {MEMBER_MONTHS_TARGET} meses o más.",
        "rarity": "raza",
    },
    {
        "id": "guardian_del_dojo",
        "name": "El Guardián del Dojo",
        "description": f"Trackea {MATCHES_TARGET_GUARDIAN} partidas o más.",
        "rarity": "raza",
    },
    {
        "id": "voz_del_dojo",
        "name": "Voz del Dojo",
        "description": "Participa por primera vez: comenta un perfil, crea una Tier List o publica un FODA.",
        "rarity": "raza",
    },
    {
        "id": "mas_alla_del_hado",
        "name": "Más Allá del Hado",
        "description": f"Alcanza un win rate de {int(WINRATE_TARGET * 100)}% o más con al menos {MIN_MATCHES_FOR_WINRATE_ACHIEVEMENT} partidas trackeadas.",
        "rarity": "ansatsuken",
    },
    {
        "id": "rey_de_la_racha",
        "name": "Rey de la Racha",
        "description": f"Consigue una racha de {WIN_STREAK_TARGET} victorias consecutivas.",
        "rarity": "ansatsuken",
    },
    {
        "id": "poder_psiquico_absoluto",
        "name": "Poder Psíquico Absoluto",
        "description": f"Alcanza el rango Ultimate Master ({ULTIMATE_MASTER_MR}+ MR).",
        "rarity": "psycho_power",
    },
    {
        "id": "el_mejor_en_su_categoria",
        "name": "El Mejor en su Categoría",
        "description": "Sé el número 1 del roster de TDF en alguna categoría de Records.",
        "rarity": "psycho_power",
    },
    {
        "id": "el_trono_del_dojo",
        "name": "El Trono del Dojo",
        "description": "Sé el número 1 en Master Rating de todo el roster de TDF.",
        "rarity": "satsui_no_hado",
    },
]


def _longest_win_streak(db: Session, cfn_id: str) -> int:
    """Recorre las partidas de UN jugador en orden cronológico — no hay
    forma directa de calcular "racha más larga" en SQL puro sin window
    functions más elaboradas que lo que amerita un roster chico (11-20
    personas); un loop en Python por jugador es correcto y suficiente
    acá (ver CODESTYLE.md: no sobre-ingenierizar)."""
    rows = (
        db.query(CFNMatch.won)
        .filter(CFNMatch.cfn_id == cfn_id, CFNMatch.won.isnot(None))
        .order_by(CFNMatch.played_at.asc())
        .all()
    )
    best = current = 0
    for (won,) in rows:
        if won:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def compute_achievements(db: Session) -> dict[str, set[str]]:
    """Calcula los logros de TODO el roster aprobado de una — varios
    logros son relativos al resto del roster (el mejor en tal
    categoría, el número 1 en MR), así que tienen que evaluarse en
    conjunto, no jugador por jugador de forma aislada.

    Se calcula EN VIVO en cada request, sin guardar "fecha en que se
    desbloqueó" — decisión deliberada (06-09-2026): el sitio nunca
    muestra un dato como cierto si dejó de serlo (ver el resto del
    proyecto), y un logro "permanente" una vez ganado rompería ese
    principio si las condiciones cambian después (ej. el win rate baja
    del umbral). Para un roster de este tamaño, calcularlo en cada
    pedido es barato — no hace falta un cron ni una tabla nueva."""
    rows = (
        db.query(CFNRegistration, CFNProfile)
        .filter(CFNRegistration.status == "approved")
        .outerjoin(CFNProfile, CFNProfile.cfn_id == CFNRegistration.cfn_id)
        .all()
    )
    cfn_ids = [reg.cfn_id for reg, _ in rows]
    profile_by_cfn = {reg.cfn_id: profile for reg, profile in rows}
    user_id_by_cfn = {reg.cfn_id: reg.user_id for reg, _ in rows}

    match_rows = (
        db.query(
            CFNMatch.cfn_id,
            func.count(CFNMatch.id),
            func.sum(case((CFNMatch.won.is_(True), 1), else_=0)),
            func.sum(case((CFNMatch.won.is_(False), 1), else_=0)),
        )
        .group_by(CFNMatch.cfn_id)
        .all()
    )
    totals = {
        cfn_id: (total, wins or 0, losses or 0)
        for cfn_id, total, wins, losses in match_rows
    }
    streaks = {cfn_id: _longest_win_streak(db, cfn_id) for cfn_id in cfn_ids}

    # "Voz del Dojo" — participó en ALGO de lo que exige cuenta propia
    # (comentar, crear plantilla de tier list, publicar FODA). Un solo
    # query por tabla en vez de uno por jugador.
    commented_user_ids = {
        uid for (uid,) in db.query(ProfileComment.author_user_id).distinct().all()
    }
    tierlist_user_ids = {
        uid for (uid,) in db.query(TierListTemplate.created_by).distinct().all()
    }
    foda_user_ids = {
        uid
        for (uid,) in db.query(FodaEntry.created_by)
        .filter(FodaEntry.created_by.isnot(None))
        .distinct()
        .all()
    }
    participated_user_ids = commented_user_ids | tierlist_user_ids | foda_user_ids

    # "El Mejor en su Categoría" — mismo piso de partidas que el
    # leaderboard público de /jugadores, para no premiar a alguien con
    # 2 partidas que por casualidad tiene el promedio más alto
    eligible_for_records = {
        cfn_id
        for cfn_id, (total, _, _) in totals.items()
        if total >= MIN_MATCHES_FOR_RECORDS
    }
    best_in_category: set[str] = set()
    for key, _label in SKILL_CATEGORIES:
        candidates = [
            (cfn_id, getattr(profile_by_cfn[cfn_id], key))
            for cfn_id in eligible_for_records
            if profile_by_cfn.get(cfn_id) is not None
            and getattr(profile_by_cfn[cfn_id], key) is not None
        ]
        if candidates:
            best_in_category.add(max(candidates, key=lambda pair: pair[1])[0])

    # "El Trono del Dojo" — top 1 de MR de TODO el roster (no requiere
    # el piso de partidas de arriba, es sobre MR actual, no promedio)
    mr_candidates = [
        (cfn_id, profile_by_cfn[cfn_id].master_rating)
        for cfn_id in cfn_ids
        if profile_by_cfn.get(cfn_id) is not None
        and profile_by_cfn[cfn_id].master_rating is not None
    ]
    top_mr_cfn_id = (
        max(mr_candidates, key=lambda pair: pair[1])[0] if mr_candidates else None
    )

    now = datetime.now(timezone.utc)
    result: dict[str, set[str]] = {}
    for reg, profile in rows:
        cfn_id = reg.cfn_id
        unlocked: set[str] = set()
        total, wins, losses = totals.get(cfn_id, (0, 0, 0))
        decided = wins + losses
        win_rate = wins / decided if decided > 0 else None
        member_since = reg.reviewed_at or reg.requested_at
        months_member = (now - member_since).days / 30.44

        if months_member >= MEMBER_MONTHS_TARGET:
            unlocked.add("espiritu_inquebrantable")
        if total >= MATCHES_TARGET_GUARDIAN:
            unlocked.add("guardian_del_dojo")
        if user_id_by_cfn.get(cfn_id) in participated_user_ids:
            unlocked.add("voz_del_dojo")
        if (
            win_rate is not None
            and win_rate >= WINRATE_TARGET
            and total >= MIN_MATCHES_FOR_WINRATE_ACHIEVEMENT
        ):
            unlocked.add("mas_alla_del_hado")
        if streaks.get(cfn_id, 0) >= WIN_STREAK_TARGET:
            unlocked.add("rey_de_la_racha")
        if profile is not None and (profile.master_rating or 0) >= ULTIMATE_MASTER_MR:
            unlocked.add("poder_psiquico_absoluto")
        if cfn_id in best_in_category:
            unlocked.add("el_mejor_en_su_categoria")
        if cfn_id == top_mr_cfn_id:
            unlocked.add("el_trono_del_dojo")

        result[cfn_id] = unlocked
    return result


def total_ap(unlocked_ids: set[str]) -> int:
    return sum(
        RARITY_AP[a["rarity"]] for a in ACHIEVEMENTS_CATALOG if a["id"] in unlocked_ids
    )
