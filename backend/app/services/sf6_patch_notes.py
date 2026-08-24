"""Fetch + parseo de las notas de parche de SF6 (battle change list) —
a diferencia de sf6_meta.py, esto SÍ necesita parsear HTML (no hay una
API JSON pública para esto, confirmado 21-08-2026). Pero tampoco necesita
Playwright: son páginas HTML normales del servidor, el contenido no se
carga por JavaScript (confirmado con web_fetch simple).

Selectores basados en texto (buscar el heading "Overall Concept", etc.),
no en clases CSS — no tenemos el HTML real de Capcom para confirmar
nombres de clase, mismo criterio que get_advanced_stats en
cfn_scraper.py. Probablemente necesite una vuelta de ajuste con --debug
la primera vez que corra contra el sitio real.
"""

import logging
import re

import httpx
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

BASE_URL = "https://www.streetfighter.com/6/buckler/en/battle_change"

# los ~31 personajes conocidos al momento de escribir esto (21-08-2026)
# — Capcom agrega personajes nuevos de vez en cuando (DLC), esta lista
# hay que actualizarla a mano cuando eso pase. tool_name es el que usa
# Capcom en sus URLs (.../battle_change/{patch_id}/{tool_name}).
CHARACTERS = [
    ("luke", "LUKE"),
    ("jamie", "JAMIE"),
    ("manon", "MANON"),
    ("kimberly", "KIMBERLY"),
    ("marisa", "MARISA"),
    ("lily", "LILY"),
    ("jp", "JP"),
    ("juri", "JURI"),
    ("deejay", "DEE JAY"),
    ("cammy", "CAMMY"),
    ("ryu", "RYU"),
    ("honda", "E. HONDA"),
    ("blanka", "BLANKA"),
    ("guile", "GUILE"),
    ("ken", "KEN"),
    ("chunli", "CHUN-LI"),
    ("zangief", "ZANGIEF"),
    ("dhalsim", "DHALSIM"),
    ("rashid", "RASHID"),
    ("aki", "A.K.I."),
    ("ed", "ED"),
    ("gouki", "AKUMA"),
    ("vega", "M. BISON"),
    ("terry", "TERRY"),
    ("mai", "MAI"),
    ("elena", "ELENA"),
    ("sagat", "SAGAT"),
    ("cviper", "C. VIPER"),
    ("alex", "ALEX"),
    ("ingrid", "INGRID"),
    ("yasmine", "YASMINE"),
]

# mismos headers que sf6_meta.py — sin ellos Capcom devuelve 403
# (confirmado por Seba, 21-08-2026)
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _fetch_soup(url: str) -> BeautifulSoup | None:
    try:
        resp = httpx.get(url, headers=_HEADERS, timeout=20, follow_redirects=True)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except Exception as exc:  # noqa: BLE001 — cualquier falla acá no debe tumbar el resto del refresh
        logger.warning("fetch_patch_notes falló para %s: %s", url, exc)
        return None


def _heading_by_text(soup: BeautifulSoup, text: str) -> Tag | None:
    """Busca un heading (h1-h5) cuyo texto sea exactamente ese, sin
    distinguir mayúsculas — no sabemos qué nivel de heading usa Capcom
    para cada sección, así que se prueban todos."""
    for tag in soup.find_all(re.compile(r"^h[1-5]$")):
        if tag.get_text(strip=True).lower() == text.lower():
            return tag
    return None


def _paragraphs_until_next_heading(start: Tag) -> str:
    """Junta el texto de todos los <p> (u otro texto suelto) entre un
    heading y el próximo heading — así se saca la prosa de una sección
    sin tener que saber la estructura exacta del HTML alrededor."""
    parts = []
    for sibling in start.find_next_siblings():
        if re.match(r"^h[1-5]$", sibling.name or ""):
            break
        text = sibling.get_text(separator=" ", strip=True)
        if text:
            parts.append(text)
    return "\n\n".join(parts)


def _changes_table_after(start: Tag) -> list[dict]:
    """Busca la primera <table> después de un heading dado y la
    convierte en una lista de {move_name, category, details} — NO
    confirmado contra HTML real todavía si Capcom realmente usa <table>
    para esto (podría ser divs con otra estructura), revisar con
    --debug la primera corrida real."""
    table = start.find_next("table")
    if table is None:
        return []

    rows = []
    for tr in table.find_all("tr"):
        cells = [td.get_text(separator=" ", strip=True) for td in tr.find_all("td")]
        if len(cells) >= 3:
            rows.append(
                {"move_name": cells[0], "category": cells[1], "details": cells[2]}
            )
        elif len(cells) == 2:
            # tabla "Universal" no tiene columna de nombre de movimiento,
            # solo categoría + detalle
            rows.append({"move_name": None, "category": cells[0], "details": cells[1]})
    return rows


def fetch_patch_overview(patch_id: str) -> dict | None:
    """Resumen general de un parche: título, filosofía de diseño
    (Overall Concept) y cambios que aplican a todo el roster
    (Universal). None si el parche no existe (404) o algo falló."""
    soup = _fetch_soup(f"{BASE_URL}/{patch_id}")
    if soup is None:
        return None

    title_tag = soup.find("h1")
    title = title_tag.get_text(strip=True) if title_tag else patch_id

    overall_concept = ""
    concept_heading = _heading_by_text(soup, "Overall Concept")
    if concept_heading:
        overall_concept = _paragraphs_until_next_heading(concept_heading)

    universal_changes: list[dict] = []
    universal_heading = _heading_by_text(soup, "Universal")
    if universal_heading:
        universal_changes = _changes_table_after(universal_heading)

    return {
        "title": title,
        "overall_concept": overall_concept,
        "universal_changes": universal_changes,
    }


def fetch_character_changes(patch_id: str, tool_name: str) -> dict | None:
    """Detalle de un personaje puntual en un parche puntual: su propio
    resumen de diseño y la tabla de cambios de movimientos. None si ese
    personaje no tuvo cambios este parche (o si la página no existe) —
    no todos los personajes salen tocados en cada parche."""
    soup = _fetch_soup(f"{BASE_URL}/{patch_id}/{tool_name}")
    if soup is None:
        return None

    summary = ""
    summary_heading = _heading_by_text(soup, "Adjustment Summary")
    if summary_heading:
        summary = _paragraphs_until_next_heading(summary_heading)

    changes: list[dict] = []
    changes_heading = _heading_by_text(soup, "Changes")
    if changes_heading:
        changes = _changes_table_after(changes_heading)

    if not summary and not changes:
        # la página existe pero no encontramos nada reconocible — o el
        # personaje no tuvo cambios este parche, o los selectores no
        # calzan. No se puede distinguir un caso del otro sin ver el
        # HTML real, así que se devuelve None en los dos casos (mejor
        # omitir un personaje que mostrar un bloque vacío).
        return None

    return {"summary": summary, "changes": changes}


def fetch_full_patch(patch_id: str) -> dict | None:
    """Arma el patch completo: resumen general + el detalle de cada
    personaje que sí tuvo cambios (los que no, se omiten del resultado
    en vez de aparecer vacíos)."""
    overview = fetch_patch_overview(patch_id)
    if overview is None:
        return None

    characters = []
    for tool_name, alpha in CHARACTERS:
        result = fetch_character_changes(patch_id, tool_name)
        if result is not None:
            characters.append(
                {
                    "tool_name": tool_name,
                    "alpha": alpha,
                    "summary": result["summary"],
                    "changes": result["changes"],
                }
            )

    return {
        "title": overview["title"],
        "overall_concept": overview["overall_concept"],
        "universal_changes": overview["universal_changes"],
        "characters": characters,
    }


def fetch_latest_patch_id() -> str | None:
    """El patch_id más reciente (ej. "20260803"), sacado del link
    canónico de la página base /battle_change (sin fecha) — esa página
    siempre redirige/apunta al parche más nuevo."""
    soup = _fetch_soup(BASE_URL)
    if soup is None:
        return None

    canonical = soup.find("link", rel="canonical")
    if canonical and canonical.get("href"):
        match = re.search(r"/battle_change/(\d{8})", canonical["href"])
        if match:
            return match.group(1)

    # respaldo: buscar el primer link a /battle_change/{8 dígitos} en
    # toda la página, por si el <link rel="canonical"> no está o no
    # tiene el patch_id (no confirmado cuál de los dos hace falta,
    # revisar con --debug)
    link = soup.find("a", href=re.compile(r"/battle_change/\d{8}$"))
    if link:
        match = re.search(r"/battle_change/(\d{8})", link["href"])
        if match:
            return match.group(1)

    return None
