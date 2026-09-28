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
import re

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


# El Command List (movelist) de Capcom no usa una tabla -- cada
# movimiento es un <li> con una miniatura, el nombre, y el input
# representado como una secuencia de <img> (flechas y botones), no
# texto. Este mapeo convierte el nombre de archivo del ícono (sin
# carpeta ni extensión) a un símbolo de notación estándar de FGC.
# Confirmado contra la página real de Ryu, 27-09-2026 -- puede faltar
# algún ícono de otro personaje que todavía no se vio (ej. iconos de
# carga específicos de un personaje puntual), en ese caso ese ícono
# se ignora en vez de romper el parseo entero.
_INPUT_ICON_SYMBOLS: dict[str, str] = {
    "key-d": "↓",
    "key-dr": "↘",
    "key-dl": "↙",
    "key-l": "←",
    "key-r": "→",
    "key-u": "↑",
    "key-ur": "↗",
    "key-ul": "↖",
    "key-plus": "+",
    "key-or": "/",
    "key-nutral": "N",
    # movimientos de carga (Guile, Blanka, etc.) -- Capcom usa un
    # ícono distinto al de la flecha normal para indicar "mantené
    # apretada esta dirección un rato antes de soltar", confirmado
    # por el nombre de archivo (Seba, 27-09-2026) pero sin ver el
    # ícono en sí todavía -- revisar si el símbolo visual calza una
    # vez que se pruebe contra un personaje de carga real
    "key-dc": "[mantener ↓]",
    "key-lc": "[mantener ←]",
    "arrow_3": "→",
    "icon_punch": "P",
    "icon_punch_l": "LP",
    "icon_punch_m": "MP",
    "icon_punch_h": "HP",
    "icon_kick": "K",
    "icon_kick_l": "LK",
    "icon_kick_m": "MK",
    "icon_kick_h": "HK",
}


def _icon_stem(img: Tag) -> str:
    src = img.get("src", "")
    return src.rsplit("/", 1)[-1].rsplit(".", 1)[0]


def _parse_movelist(soup: BeautifulSoup) -> dict:
    """Secciones = encabezados <h3>/<h4> ("Special Moves", "Super
    Arts", etc.), filas = un <li> por movimiento dentro de la lista
    que sigue a cada encabezado. Cada fila tiene 2 columnas: nombre
    (+ notas entre paréntesis, tal como las escribe Capcom) y el
    input reconstruido a partir de los íconos reconocidos -- los que
    no están en _INPUT_ICON_SYMBOLS (miniaturas, iconos de costo de
    Drive Gauge) se ignoran en silencio en vez de ensuciar la
    columna."""
    headings = soup.find_all(["h3", "h4"])
    sections: list[dict] = []

    for heading in headings:
        title = heading.get_text(" ", strip=True)
        if not title:
            continue
        list_el = heading.find_next(["ul", "ol"])
        if list_el is None:
            continue

        rows: list[list[str]] = []
        for li in list_el.find_all("li", recursive=False):
            name_text = li.get_text(" ", strip=True)
            # sacar el texto que ya viene de los iconos de input (los
            # nombres de archivo no aparecen en get_text, así que el
            # texto real es todo lo que NO es una imagen -- se separa
            # el nombre de las notas entre paréntesis si las hay
            match = re.match(r"^([^(]+?)(\s*\(.+\))?$", name_text)
            move_name = match.group(1).strip() if match else name_text
            notes = (match.group(2) or "").strip() if match else ""

            symbols = [
                _INPUT_ICON_SYMBOLS[stem]
                for img in li.find_all("img")
                if (stem := _icon_stem(img)) in _INPUT_ICON_SYMBOLS
            ]
            notation = " ".join(symbols)

            display_name = f"{move_name} {notes}".strip() if notes else move_name
            if display_name:
                rows.append([display_name, notation])

        if rows:
            sections.append({"title": title, "rows": rows})

    return {"headers": ["Movimiento", "Comando"], "sections": sections}


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
    """page es "frame" (tabla) o "movelist" (lista de íconos, ver
    _parse_movelist) -- son estructuras de página completamente
    distintas en el sitio de Capcom, cada una con su propio parser.
    Tira httpx.HTTPStatusError si Capcom devuelve algo que no sea 200
    (ej. si cambiaron la URL o el anti-bot bloquea el pedido)."""
    url = f"{BASE_URL}/{character_slug}/{page}"
    with httpx.Client(timeout=30) as client:
        res = client.get(url, headers=_headers(character_slug, page))
        res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    if page == "movelist":
        result = _parse_movelist(soup)
        if not result["sections"]:
            raise ValueError(
                f"No se encontró ninguna sección de movimientos en {url} -- "
                "probablemente Capcom cambió el diseño de la página, hay "
                "que revisar el parser a mano"
            )
        return result

    table = _find_main_table(soup)
    if table is None:
        raise ValueError(
            f"No se encontró ninguna tabla en {url} -- probablemente "
            "Capcom cambió el diseño de la página, hay que revisar el "
            "parser a mano"
        )
    return _parse_table(table)
