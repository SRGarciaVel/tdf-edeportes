"""Refresca el cache de stats de CFN y el historial de partidas para los
jugadores configurados.

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

"""Refresca el cache de stats de CFN y el historial de partidas para los
jugadores configurados.

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

El roster de a quién trackear YA NO vive hardcodeado acá — viene de
cfn_registrations (status="approved", ver app/models/cfn_registration.py
y el flujo de auto-registro + panel de staff). Alguien nuevo aprobado
entra a la próxima corrida solo, sin tocar este archivo.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models import CFNMatch, CFNProfile, CFNRegistration
from app.services.cfn_scraper import refresh_all_players


def save_profiles(db, results: list[dict], players: dict[str, str]) -> tuple[int, int]:
    ok, failed = 0, 0
    for r in results:
        display_name = players.get(r["cfn_id"], r["display_name"] or r["cfn_id"])
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
            lp_display = (
                f"{r['league_points']}LP"
                if r["league_points"] is not None
                else "sin LP"
            )
            print(
                f"  ✓ {display_name}: {mr_display} {lp_display} - {r['character_name']}"
            )

        db.commit()
    return ok, failed


def save_matches(db, matches: list[dict]) -> tuple[int, int, int]:
    """Inserta partidas nuevas, salteando las que ya vimos en una corrida
    anterior — el sitio muestra las últimas N partidas, así que corridas
    consecutivas del cron ven partidas repetidas todo el tiempo.

    Si la partida YA existe pero esta corrida sacó un opponent_cfn_id
    distinto al que tenía guardado, lo actualiza — necesario para que una
    corrección del scraper (ej. el bug real del 19-08-2026: se guardaba
    el CFN de la cuenta logueada en vez del rival real) se aplique
    también a partidas ya guardadas, no solo a las nuevas de acá en
    adelante."""
    new, skipped, updated = 0, 0, 0
    for m in matches:
        existing = (
            db.query(CFNMatch)
            .filter(
                CFNMatch.cfn_id == m["cfn_id"],
                CFNMatch.played_at == m["played_at"],
                CFNMatch.opponent_name == m["opponent_name"],
            )
            .first()
        )
        if existing:
            if (
                m.get("opponent_cfn_id")
                and existing.opponent_cfn_id != m["opponent_cfn_id"]
            ):
                existing.opponent_cfn_id = m["opponent_cfn_id"]
                updated += 1
            else:
                skipped += 1
            continue
        db.add(CFNMatch(**m))
        new += 1
    db.commit()
    return new, skipped, updated


def save_advanced_stats(db, stats: list[dict]) -> int:
    """ "Records" — promedios de las últimas 100 partidas (ver
    get_advanced_stats en cfn_scraper.py). Se guardan en la misma fila
    de CFNProfile que MR/LP, no en una tabla aparte — es el mismo tipo
    de cache (estado actual recalculado cada corrida), solo que en vez
    de "rango actual" es "promedio de cómo juega". Requiere que la fila
    ya exista (la crea save_profiles, que corre antes en main()).
    Silenciosamente no hace nada si el perfil todavía no existe — no
    debería pasar en la práctica, pero evita un crash feo si el orden
    de llamadas cambia alguna vez."""
    saved = 0
    for s in stats:
        profile = db.query(CFNProfile).filter(CFNProfile.cfn_id == s["cfn_id"]).first()
        if profile is None:
            continue
        profile.drive_impact_received = s["drive_impact_received"]
        profile.drive_parry_perfect = s["drive_parry_perfect"]
        profile.drive_impact_punish_landed = s["drive_impact_punish_landed"]
        profile.corner_time_opponent = s["corner_time_opponent"]
        profile.throws_landed = s["throws_landed"]
        saved += 1
    db.commit()
    return saved


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()

    players = {
        reg.cfn_id: reg.display_name
        for reg in db.query(CFNRegistration)
        .filter(CFNRegistration.status == "approved")
        .all()
    }

    # partidas que YA tienen opponent_cfn_id resuelto de una corrida
    # anterior — se pasan al scraper para que NO vuelva a abrir el modal
    # de detalle en esas (ver get_match_history en cfn_scraper.py), solo
    # en las genuinamente nuevas o en las que todavía no se pudieron
    # resolver. A propósito NO incluye partidas guardadas SIN
    # opponent_cfn_id (sea porque nunca se intentó, o porque el bug real
    # del 19-08-2026 guardó ahí el CFN de la cuenta logueada en vez del
    # rival real) — esas se vuelven a intentar en cada corrida hasta que
    # se resuelvan bien, save_matches ya sabe actualizar el valor de una
    # partida existente en vez de solo insertar nuevas.
    known_match_keys = frozenset(
        (cfn_id, played_at, opponent_name)
        for cfn_id, played_at, opponent_name in db.query(
            CFNMatch.cfn_id, CFNMatch.played_at, CFNMatch.opponent_name
        )
        .filter(CFNMatch.opponent_cfn_id.isnot(None))
        .all()
    )

    print(f"Consultando {len(players)} jugadores...")
    profiles, matches, advanced_stats = refresh_all_players(
        list(players.keys()), debug=args.debug, known_match_keys=known_match_keys
    )

    ok, failed = save_profiles(db, profiles, players)

    saved_records = save_advanced_stats(db, advanced_stats)
    print(
        f"\nRecords: {saved_records} perfiles con stats de Drive Impact/Perfect Parry actualizados"
    )

    print(f"\nHistorial: {len(matches)} partidas encontradas en total")
    new, skipped, updated = save_matches(db, matches)
    print(f"  {new} nuevas guardadas, {skipped} ya existían, {updated} corregidas")

    tracked_ids = set(players.keys())
    encounters = [
        m
        for m in matches
        if m.get("opponent_cfn_id") and m["opponent_cfn_id"] in tracked_ids
    ]
    if encounters:
        print(f"\n¡{len(encounters)} cruce(s) entre gente trackeada detectados!")
        for e in encounters:
            own_name = players.get(e["cfn_id"], e["cfn_id"])
            rival_name = players.get(e["opponent_cfn_id"], e["opponent_cfn_id"])
            print(f"  {own_name} vs {rival_name} — {e['played_at']}")

    db.close()
    print(f"\nListo: {ok} perfiles ok, {failed} con error.")
    if failed and not args.debug:
        print("Volvé a correr con --debug para ver capturas de cada paso.")


if __name__ == "__main__":
    main()
