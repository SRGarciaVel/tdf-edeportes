"""Refresca el cache de stats de CFN para los jugadores configurados.

Uso:
    docker compose exec backend python scripts/refresh_cfn.py
    docker compose exec backend python scripts/refresh_cfn.py --debug

Con --debug guarda screenshots + HTML de cada paso en
backend/debug_output/ (el navegador siempre corre headless, sin ventana —
un contenedor no tiene servidor gráfico) — usar esto la primera vez, o
cualquier vez que Capcom haya cambiado algo y el scraper empiece a
devolver todo en None.

Pensado para correr por cron cada 1 hora (SPECS.md #12), no en cada
request — ver app/api/cfn.py, que solo lee de la base.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal  # noqa: E402
from app.models import CFNProfile  # noqa: E402
from app.services.cfn_scraper import refresh_all_players  # noqa: E402

# CFN ID -> nombre a mostrar (SPECS.md #12)
PLAYERS: dict[str, str] = {
    "2844671427": "Sirxtias",
    "2908057346": "Drachen",
    "4100957688": "BF",
    "1733837998": "AckermanFG",
    "1027356162": "Younghou",
    "3987753314": "Pochoclo23",
    "1009159858": "Craime",
    "3381453962": "Blaz",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    print(f"Consultando {len(PLAYERS)} jugadores...")
    results = refresh_all_players(list(PLAYERS.keys()), debug=args.debug)
    db = SessionLocal()
    ok, failed = 0, 0
    for r in results:
        display_name = PLAYERS.get(r["cfn_id"], r["display_name"] or r["cfn_id"])
        profile = db.query(CFNProfile).filter(CFNProfile.cfn_id == r["cfn_id"]).first()
        if profile is None:
            profile = CFNProfile(cfn_id=r["cfn_id"])
            db.add(profile)

        profile.display_name = display_name
        profile.league_rank = r["league_rank"]
        profile.league_points = r["league_points"]
        profile.master_rating = r["master_rating"]
        profile.character_name = r["character_name"]
        profile.last_error = r["error"]

        if r["error"]:
            failed += 1
            print(f"  ✗ {display_name} ({r['cfn_id']}): {r['error']}")
        else:
            ok += 1
            mr_display = f"{r['master_rating']}MR" if r["master_rating"] else "sin MR"
            print(f"  ✓ {display_name}: {mr_display} {r['league_points']}LP - {r['character_name']}")

        db.commit()

    db.close()
    print(f"\nListo: {ok} ok, {failed} con error.")
    if failed and not args.debug:
        print("Volvé a correr con --debug para ver capturas de cada paso.")


if __name__ == "__main__":
    main()
