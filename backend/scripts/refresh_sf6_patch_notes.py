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

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import SF6PatchNote
from app.services.sf6_patch_notes import fetch_full_patch, fetch_latest_patch_id
from app.services.translation import translate_to_spanish


def add_translations(data: dict) -> dict:
    """Agrega campos "_es" al lado de cada texto en inglés — nunca
    reemplaza el original, así el frontend puede elegir cuál mostrar
    (o si la traducción falló/no hay clave configurada, los campos
    "_es" simplemente van a valer lo mismo que el inglés, ver
    translate_to_spanish). Los nombres de movimientos de cada
    personaje se pasan como "términos a proteger" al traducir su
    propio resumen y el detalle de sus cambios, para que no se
    traduzcan por accidente si aparecen mencionados en la prosa."""
    data["overall_concept_es"] = translate_to_spanish(data["overall_concept"])

    for change in data["universal_changes"]:
        change["category_es"] = translate_to_spanish(change["category"])
        change["details_es"] = translate_to_spanish(change["details"])

    for character in data["characters"]:
        move_names = [c["move_name"] for c in character["changes"] if c["move_name"]]
        character["summary_es"] = translate_to_spanish(
            character["summary"], extra_terms=move_names
        )
        for change in character["changes"]:
            change["category_es"] = translate_to_spanish(change["category"])
            change["details_es"] = translate_to_spanish(
                change["details"], extra_terms=move_names
            )

    return data


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

    if settings.deepl_api_key:
        print("Traduciendo al español (protegiendo terminología de FGC)...")
        data = add_translations(data)
    else:
        print(
            "⚠ Sin DEEPL_API_KEY configurada — se guarda solo en inglés, sin traducir."
        )

    db = SessionLocal()
    save_patch(db, patch_id, data)
    db.close()

    print(f"✓ Guardado: {data['title']}")
    print(f"  {len(data['universal_changes'])} cambios universales")
    print(f"  {len(data['characters'])} personajes con cambios este parche")


if __name__ == "__main__":
    main()
