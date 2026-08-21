"""Fetch del "Meta actual" de SF6 (uso de personajes y diagrama de
matchups) — a diferencia de cfn_scraper.py, esto NO usa Playwright ni
sesión: es una API pública real de Capcom, confirmada sin auth el
20-21/08/2026 (ver ROADMAP.md). Una llamada HTTP simple alcanza.
"""

import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://www.streetfighter.com/6/buckler/api/en/stats"

# los 4 tipos confirmados — "_master" filtra a partidas de rango Master
# únicamente, más relevante para preparación competitiva real que el
# promedio mezclado con todos los rangos
SNAPSHOT_TYPES = ["usagerate", "usagerate_master", "dia", "dia_master"]


# httpx sin encabezados de navegador choca con la protección anti-bot de
# Capcom (403 real, confirmado por Seba, 21-08-2026) — mismo User-Agent
# que ya usa cfn_scraper.py con Playwright, y un Referer apuntando a la
# página real que consume este mismo endpoint (así la request se ve
# como si viniera de alguien navegando la página de stats de verdad, no
# de un script pegándole directo a la API).
def _headers(snapshot_type: str) -> dict[str, str]:
    return {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": f"https://www.streetfighter.com/6/buckler/en/stats/{snapshot_type}",
    }


def current_month() -> str:
    """ "yyyymm" del mes actual, mismo formato que usa la URL de Capcom.
    Capcom publica el mes actual el segundo jueves de cada mes — si
    todavía no llegó esa fecha, el mes actual puede no tener datos
    todavía (ver fetch_snapshot, devuelve None en ese caso, no explota)."""
    return datetime.now(timezone.utc).strftime("%Y%m")


def previous_month(month: str) -> str:
    """ "yyyymm" del mes anterior a uno dado — usado como respaldo si el
    mes actual todavía no tiene datos publicados."""
    year, mon = int(month[:4]), int(month[4:])
    if mon == 1:
        return f"{year - 1}12"
    return f"{year}{mon - 1:02d}"


def fetch_snapshot(snapshot_type: str, month: str) -> dict | None:
    """Trae el JSON crudo de un tipo/mes puntual. None si Capcom todavía
    no publicó ese mes (404) o si algo más falló — nunca tira excepción
    hacia arriba, el que llama decide qué hacer con un None (ej.
    reintentar con el mes anterior)."""
    if snapshot_type not in SNAPSHOT_TYPES:
        raise ValueError(f"snapshot_type inválido: {snapshot_type}")

    url = f"{BASE_URL}/{snapshot_type}/{month}"
    try:
        resp = httpx.get(
            url, headers=_headers(snapshot_type), timeout=15, follow_redirects=True
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:  # noqa: BLE001 — cualquier falla acá no debe tumbar el resto del refresh
        logger.warning("fetch_snapshot falló para %s/%s: %s", snapshot_type, month, exc)
        return None


def fetch_latest_snapshot(snapshot_type: str) -> tuple[str, dict] | None:
    """Intenta el mes actual primero, y si Capcom todavía no lo publicó
    (pasa cerca de fin/inicio de mes, antes del segundo jueves), cae al
    mes anterior. Devuelve (month, data) o None si ninguno de los dos
    funcionó."""
    month = current_month()
    data = fetch_snapshot(snapshot_type, month)
    if data is not None:
        return month, data

    month = previous_month(month)
    data = fetch_snapshot(snapshot_type, month)
    if data is not None:
        return month, data

    return None
