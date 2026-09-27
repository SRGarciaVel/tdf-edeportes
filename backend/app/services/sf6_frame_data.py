"""Fetch y parseo de Frame Data y Command List oficiales de Capcom, un
personaje a la vez — mismo dominio ya sancionado que sf6_meta.py, pero
acá es HTML real para parsear con BeautifulSoup, no una API JSON
limpia. Idea de Chubi, 22-09-2026 (ver ROADMAP.md): mostrar esto en la
web de TDF en vez de depender de un sitio de frame data de terceros.

El parser busca la tabla más grande de la página (la que tiene más
filas) en vez de depender de nombres de clase específicos de Capcom
-- más robusto ante cambios menores de diseño, pero casi seguro
necesita un ajuste real la primera vez que se corre contra el sitio en
vivo (mismo patrón que cfn_scraper.py: nunca se asume que el primer
intento anda perfecto).
"""

import logging

import httpx
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

BASE_URL = "https://www.streetfighter.com/6/es-us/character"

# slug de Capcom -> nombre a mostrar. Sacado directo de la página
# índice de personajes (streetfighter.com/6/es-us/character),
# confirmado 22-09-2026 -- 32 personajes. "vega_mbison" y
# "gouki_akuma" son un solo slug para un personaje que tiene dos
# nombres según la región (M. Bison/Vega y Akuma/Gouki
# respectivamente), no dos personajes distintos.
CHARACTER_SLUGS: dict[str, str] = {
    "ryu": "Ryu",
    "luke": "Luke",
    "jamie": "Jamie",
    "chunli": "Chun-Li",
    "guile": "Guile",
    "kimberly": "Kimberly",
    "juri": "Juri",
    "ken": "Ken",
    "blanka": "Blanka",
    "dhalsim": "Dhalsim",
    "ehonda": "E. Honda",
    "deejay": "Dee Jay",
    "manon": "Manon",
    "marisa": "Marisa",
    "jp": "JP",
    "zangief": "Zangief",
    "lily": "Lily",
    "cammy": "Cammy",
    "rashid": "Rashid",
    "aki": "A.K.I.",
    "ed": "Ed",
    "gouki_akuma": "Akuma",
    "vega_mbison": "M. Bison",
    "terry": "Terry",
    "mai": "Mai",
    "elena": "Elena",
    "sagat": "Sagat",
    "cviper": "C. Viper",
    "alex": "Alex",
    "ingrid": "Ingrid",
    "yasmine": "Yasmine",
    "arjun": "Arjun",
}


# mismo User-Agent que sf6_meta.py -- confirmado que Capcom rechaza
# pedidos sin encabezados de navegador con 403 (21-08-2026)
def _headers(character_slug: str, page: str) -> dict[str, str]:
    return {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-US,es;q=0.9",
        "Referer": f"{BASE_URL}/{character_slug}",
    }


def _find_main_table(soup: BeautifulSoup) -> Tag | None:
    """La tabla con más filas de <tr> en toda la página -- Frame Data
    y Command List tienen una sola tabla grande de datos, rodeada de
    navegación/menús que no nos interesan."""
    tables = soup.find_all("table")
    if not tables:
        return None
    return max(tables, key=lambda t: len(t.find_all("tr")))


def _parse_table(table: Tag) -> dict:
    """Convierte la tabla en secciones (Normal Moves, Special Moves,
    etc. son sub-encabezados de una sola fila dentro de la misma
    tabla en el sitio de Capcom) con filas de texto plano por
    movimiento. No intenta tipar startup/recovery/etc. como números
    separados -- las notas y excepciones de Capcom (ej. "3 frame(s)
    after landing", "D" para knockdown) rompen cualquier columna
    fija, así que se guarda cada celda como texto y el frontend arma
    la tabla tal cual."""
    rows = table.find_all("tr")
    if not rows:
        return {"headers": [], "sections": []}

    header_cells = rows[0].find_all(["th", "td"])
    headers = [c.get_text(" ", strip=True) for c in header_cells]

    sections: list[dict] = []
    current_section = {"title": "General", "rows": []}
    for row in rows[1:]:
        cells = row.find_all(["th", "td"])
        texts = [c.get_text(" ", strip=True) for c in cells]
        if not any(texts):
            continue
        # una fila con una sola celda de texto no vacía (el resto
        # vacías, sea cual sea el total de columnas de la tabla) es
        # un encabezado de sección (ej. "Normal Moves", "Special
        # Moves", "Throws") -- Capcom usa colspan/celdas vacías para
        # esto, no una fila corta de verdad
        non_empty = [t for t in texts if t]
        if len(non_empty) == 1:
            if current_section["rows"]:
                sections.append(current_section)
            current_section = {"title": non_empty[0], "rows": []}
            continue
        current_section["rows"].append(texts)
    if current_section["rows"]:
        sections.append(current_section)

    return {"headers": headers, "sections": sections}


def fetch_character_page(character_slug: str, page: str) -> dict:
    """page es "frame" o "movelist". Devuelve la tabla ya parseada;
    tira httpx.HTTPStatusError si Capcom devuelve algo que no sea
    200 (ej. si cambiaron la URL o el anti-bot bloquea el pedido)."""
    url = f"{BASE_URL}/{character_slug}/{page}"
    with httpx.Client(timeout=30) as client:
        res = client.get(url, headers=_headers(character_slug, page))
        res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")
    table = _find_main_table(soup)
    if table is None:
        raise ValueError(
            f"No se encontró ninguna tabla en {url} -- probablemente "
            "Capcom cambió el diseño de la página, hay que revisar el "
            "parser a mano"
        )
    return _parse_table(table)
