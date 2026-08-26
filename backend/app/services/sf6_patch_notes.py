"""Fetch + parseo de las notas de parche de SF6 (battle change list) —
a diferencia de sf6_meta.py, esto SÍ necesita parsear HTML (no hay una
API JSON pública para esto, confirmado 21-08-2026). Pero tampoco necesita
Playwright: son páginas HTML normales del servidor, el contenido no se
carga por JavaScript (confirmado con web_fetch simple).

Estructura real confirmada con HTML de verdad (Seba, 21-08-2026): la
tabla de cambios NO usa <table>/<tr>/<td>, usa <dl>/<dt>/<dd> — cada fila
es un <dl> separado con clase que contiene "content_table_body", y el
encabezado un <dl> con clase que contiene "content_table_head". Los
títulos de sección ("Overall Concept", "Adjustment Summary") tampoco son
h1-h5, son texto suelto dentro de divs con clases generadas
(content_*__hash, típico de CSS Modules) — por eso la búsqueda de
headings acá NO se restringe a ningún tag en particular, busca el nodo
de texto exacto y listo.
"""

import logging
import re

import httpx
from bs4 import BeautifulSoup, NavigableString, Tag

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
    """Busca un elemento cuyo texto sea exactamente ese, sin distinguir
    mayúsculas — NO se restringe a ningún tag en particular a
    propósito: confirmado con HTML real (Seba, 21-08-2026) que estos
    "títulos" son texto suelto en divs con clases generadas
    (content_*__hash), no headings semánticos h1-h5 (esa suposición
    causaba que la búsqueda fallara siempre, bug real encontrado el
    mismo día). Busca el nodo de TEXTO exacto, no el tag que lo
    contiene, para no agarrar por accidente un contenedor gigante que
    también "tiene" ese texto en algún lado adentro."""
    for string in soup.find_all(string=True):
        if (
            isinstance(string, NavigableString)
            and string.strip().lower() == text.lower()
        ):
            return string.parent
    return None


def _paragraphs_until_next_heading(start: Tag) -> str:
    """Junta el texto de los hermanos siguientes a un heading hasta
    toparse con el inicio de una tabla de cambios (clase que contiene
    "content_table" — estructura real confirmada, ver
    _changes_table_after). Antes solo paraba en h1-h5 (que no existen
    en esta página), así que se tragaba la tabla entera y hasta la
    navegación de "siguiente personaje" (bug real encontrado por Seba,
    21-08-2026)."""
    parts = []
    for sibling in start.find_next_siblings():
        classes = sibling.get("class") or []
        if any("content_table" in c for c in classes):
            break
        text = sibling.get_text(separator=" ", strip=True)
        if text:
            parts.append(text)
    return "\n\n".join(parts)


def _changes_table_after(soup: BeautifulSoup) -> list[dict]:
    """Tabla de cambios armada con <dl>/<dt>/<dd>, no <table> — cada
    fila es un <dl> separado con clase que contiene
    "content_table_body" (no <tr> dentro de una sola tabla), con el
    nombre del movimiento en <dt> y categoría/detalle en dos <div>
    dentro de <dd>. El encabezado es un <dl> aparte con clase que
    contiene "content_table_head" — se busca directo por esa clase
    (la primera de toda la página), sin necesitar un punto de anclaje
    por texto: "Changes" es el label de la primera columna del
    encabezado, no un título de sección — buscar por ese texto y
    después la "próxima" tabla se saltaba la que ya había encontrado
    (bug real encontrado en la primera versión, 21-08-2026). Cada
    página de este scraper solo tiene una tabla de este tipo, así que
    "la primera de toda la página" alcanza."""
    header = None
    for dl in soup.find_all("dl"):
        classes = dl.get("class") or []
        if any("content_table_head" in c for c in classes):
            header = dl
            break
    if header is None:
        return []

    rows = []
    for sibling in header.find_next_siblings("dl"):
        classes = sibling.get("class") or []
        if not any("content_table_body" in c for c in classes):
            break
        dt = sibling.find("dt")
        dd = sibling.find("dd")
        if dt is None or dd is None:
            continue
        divs = dd.find_all("div")
        category = divs[0].get_text(strip=True) if len(divs) > 0 else ""
        details = divs[1].get_text(separator="\n", strip=True) if len(divs) > 1 else ""
        rows.append(
            {
                "move_name": dt.get_text(strip=True) or None,
                "category": category,
                "details": details,
            }
        )
    return rows


def fetch_patch_overview(patch_id: str) -> dict | None:
    """Resumen general de un parche: título, filosofía de diseño
    (Overall Concept) y cambios que aplican a todo el roster
    (Universal). None si el parche no existe (404) o algo falló."""
    soup = _fetch_soup(f"{BASE_URL}/{patch_id}")
    if soup is None:
        return None

    title_tag = soup.find("h1")
    title = title_tag.get_text(strip=True) if title_tag else ""
    if not title:
        # el h1 puede venir vacío si el título en realidad es una
        # imagen con el texto como "alt" en vez de texto plano (visto
        # en una captura real: "![08.03.2026 update]()..." — no
        # confirmado al 100% con HTML real todavía, pero es un
        # respaldo de bajo riesgo: si tampoco encuentra nada, el
        # frontend ya sabe mostrar la fecha del patch_id en su lugar)
        img = soup.find(
            "img", alt=re.compile(r"\d{2}\.\d{2}\.\d{4}\s*update", re.IGNORECASE)
        )
        if img and img.get("alt"):
            title = img["alt"].strip()
    if not title:
        title = patch_id

    overall_concept = ""
    concept_heading = _heading_by_text(soup, "Overall Concept")
    if concept_heading:
        overall_concept = _paragraphs_until_next_heading(concept_heading)

    universal_changes = _changes_table_after(soup)

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

    changes = _changes_table_after(soup)

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
