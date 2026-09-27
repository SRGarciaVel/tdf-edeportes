"""Refresca el cache de Frame Data y Command List oficiales de Capcom
para los 32 personajes de SF6 -- a diferencia de refresh_sf6_meta.py,
acá se parsea HTML real con BeautifulSoup, no una API JSON limpia (ver
comentario de sf6_frame_data.py sobre el parser).

Uso:
    docker compose exec backend python scripts/refresh_sf6_frame_data.py
    docker compose exec backend python scripts/refresh_sf6_frame_data.py --solo ryu,luke

Pensado para correrse a mano después de cada balance patch de SF6, no
por cron -- los parches no salen en fecha fija como el meta mensual.

Primera corrida real: casi seguro alguno de los 32 personajes falla o
sale con el parser mal ajustado (nombres de movimiento cortados,
secciones que no separaron bien, etc.) -- es esperable, mismo patrón
que el scraper de CFN. Revisar la salida de cada uno antes de asumir
que está perfecto.
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models import SF6CharacterFrameData
from app.services.sf6_frame_data import CHARACTER_SLUGS, fetch_character_page


def save_character(
    db, slug: str, display_name: str, frame_data: dict, move_list: dict
) -> None:
    row = (
        db.query(SF6CharacterFrameData)
        .filter(SF6CharacterFrameData.character_slug == slug)
        .first()
    )
    if row is None:
        row = SF6CharacterFrameData(character_slug=slug, display_name=display_name)
        db.add(row)
    row.display_name = display_name
    row.frame_data = frame_data
    row.move_list = move_list
    db.commit()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--solo",
        help="lista de slugs separados por coma, para probar unos pocos "
        "personajes en vez de los 32 (ej. --solo ryu,luke)",
    )
    args = parser.parse_args()

    slugs = args.solo.split(",") if args.solo else list(CHARACTER_SLUGS.keys())

    db = SessionLocal()
    ok, failed = 0, 0

    for slug in slugs:
        display_name = CHARACTER_SLUGS.get(slug, slug)
        try:
            frame_data = fetch_character_page(slug, "frame")
            time.sleep(1)  # no golpear el sitio de Capcom sin pausa
            move_list = fetch_character_page(slug, "movelist")
            save_character(db, slug, display_name, frame_data, move_list)
            print(f"  ✓ {display_name} ({slug}): guardado")
            ok += 1
        except Exception as e:  # noqa: BLE001 — un personaje que falla no debe frenar el resto del lote
            print(f"  ✗ {display_name} ({slug}): {e}")
            failed += 1
        time.sleep(1)

    db.close()
    print(f"\nListo: {ok} personajes ok, {failed} con error.")


if __name__ == "__main__":
    main()
