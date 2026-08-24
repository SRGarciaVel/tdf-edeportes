"""Refresca el cache de notas de parche de SF6 (battle change list) —
usa httpx + BeautifulSoup, sin Playwright (ver sf6_patch_notes.py).

Uso:
    docker compose exec backend python scripts/refresh_sf6_patch_notes.py

A diferencia de Meta Actual (mensual, fecha fija) los parches de balance
salen sin calendario fijo — se runea a mano cuando Seba se entera que
salió uno nuevo, no por cron automático.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models import SF6PatchNote
from app.services.sf6_patch_notes import fetch_full_patch, fetch_latest_patch_id


def save_patch(db, patch_id: str, data: dict) -> None:
    row = db.query(SF6PatchNote).filter(SF6PatchNote.patch_id == patch_id).first()
    if row is None:
        row = SF6PatchNote(patch_id=patch_id)
        db.add(row)
    row.title = data["title"]
    row.data = data
    db.commit()


def main() -> None:
    patch_id = fetch_latest_patch_id()
    if patch_id is None:
        print("✗ No se pudo determinar el parche más reciente.")
        return

    print(f"Parche más reciente detectado: {patch_id}")
    print("Trayendo resumen general y detalle por personaje (~31 fetches)...")

    data = fetch_full_patch(patch_id)
    if data is None:
        print(f"✗ No se pudo traer el resumen general de {patch_id}.")
        return

    db = SessionLocal()
    save_patch(db, patch_id, data)
    db.close()

    print(f"✓ Guardado: {data['title']}")
    print(f"  {len(data['universal_changes'])} cambios universales")
    print(f"  {len(data['characters'])} personajes con cambios este parche")


if __name__ == "__main__":
    main()
