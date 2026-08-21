"""Refresca el cache del "Meta actual" de SF6 (uso de personajes y
diagrama de matchups) — a diferencia de refresh_cfn.py, esto NO usa
Playwright ni sesión: son 4 llamadas HTTP simples a una API pública real
de Capcom (confirmado 20-21/08/2026, ver ROADMAP.md).

Uso:
    docker compose exec backend python scripts/refresh_sf6_meta.py

Pensado para correr por cron una vez al mes (Capcom publica el segundo
jueves de cada mes), no cada hora como el tracker de CFN.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models import SF6MetaSnapshot
from app.services.sf6_meta import SNAPSHOT_TYPES, fetch_latest_snapshot


def save_snapshot(db, snapshot_type: str, month: str, data: dict) -> None:
    row = (
        db.query(SF6MetaSnapshot)
        .filter(
            SF6MetaSnapshot.snapshot_type == snapshot_type,
            SF6MetaSnapshot.month == month,
        )
        .first()
    )
    if row is None:
        row = SF6MetaSnapshot(snapshot_type=snapshot_type, month=month)
        db.add(row)
    row.data = data
    db.commit()


def main() -> None:
    db = SessionLocal()
    ok, failed = 0, 0

    for snapshot_type in SNAPSHOT_TYPES:
        result = fetch_latest_snapshot(snapshot_type)
        if result is None:
            print(
                f"  ✗ {snapshot_type}: no se pudo obtener (ni mes actual ni anterior)"
            )
            failed += 1
            continue

        month, data = result
        save_snapshot(db, snapshot_type, month, data)
        print(f"  ✓ {snapshot_type}: guardado para {month}")
        ok += 1

    db.close()
    print(f"\nListo: {ok} snapshots ok, {failed} con error.")


if __name__ == "__main__":
    main()
