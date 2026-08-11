"""Cliente de Buckler's Boot Camp (CFN) vía Playwright.

IMPORTANTE — leer antes de tocar este archivo:

No hay login automático. `auth.cid.capcom.com` (donde vive el login real de
Capcom ID) está protegido con Cloudflare Turnstile — un desafío interactivo
de "verificá que sos humano". No se automatiza resolver eso, por decisión
deliberada, no por limitación técnica (ver SPECS.md #12).

En cambio, se reutiliza una sesión ya autenticada por un humano: Seba se
loguea manualmente en su navegador normal (resuelve el Turnstile como
cualquier persona) y exporta las cookies de esa sesión a
`backend/cfn_session.json` (gitignored — son credenciales, no van al repo).
Este módulo carga esas cookies en el contexto de Playwright en vez de
intentar loguearse.

La sesión eventualmente vence. Cuando eso pase, `_verify_session` lo
detecta y tira un error claro pidiendo repetir el export manual — no falla
en silencio con datos viejos.

Los selectores de extracción de stats en `get_player_stats` son best-effort
(no pude ver el HTML real de un perfil todavía) — correr con `debug=True`
(ver `scripts/refresh_cfn.py --debug`) para guardar screenshots + HTML de
cada paso en `debug_output/` y ajustarlos contra lo real.
"""

import json
import logging
import re
from pathlib import Path

from playwright.sync_api import BrowserContext, Page, TimeoutError as PlaywrightTimeout, sync_playwright
from playwright_stealth import Stealth

logger = logging.getLogger(__name__)

BASE_URL = "https://www.streetfighter.com/6/buckler"
PROFILE_AUTH_URL = f"{BASE_URL}/profile/auth"
PROFILE_URL_TEMPLATE = BASE_URL + "/profile/{cfn_id}"

# CFN de AckermanFG (Seba) — es la cuenta dueña de la sesión que se carga,
# así que sirve para confirmar que el login "prendió" antes de consultar
# a nadie más. /profile/auth resultó ser una página de tránsito que no
# siempre refleja la sesión al toque; un perfil real es más confiable.
SESSION_CHECK_CFN_ID = "1733837998"

BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEBUG_DIR = BACKEND_ROOT / "debug_output"
SESSION_FILE = BACKEND_ROOT / "cfn_session.json"

_SAMESITE_MAP = {
    "no_restriction": "None",
    "unspecified": "Lax",
    "lax": "Lax",
    "strict": "Strict",
    "none": "None",
}


class CFNScraperError(Exception):
    """Cualquier fallo del scraper — sesión faltante/vencida, o el HTML de
    Capcom cambió y ningún selector matcheó."""


def _debug_dump(page: Page, name: str, debug: bool) -> None:
    if not debug:
        return
    DEBUG_DIR.mkdir(exist_ok=True)
    page.screenshot(path=str(DEBUG_DIR / f"{name}.png"), full_page=True)
    (DEBUG_DIR / f"{name}.html").write_text(page.content(), encoding="utf-8")
    logger.info("debug: guardado %s.png / %s.html en %s", name, name, DEBUG_DIR)


def _load_session_cookies(context: BrowserContext) -> None:
    """Carga backend/cfn_session.json — export manual de cookies desde un
    navegador donde Seba ya inició sesión de verdad. Formato esperado:
    compatible con la extensión "Cookie-Editor" (Chrome/Firefox), que
    exporta como lista de objetos con name/value/domain/etc.
    """
    if not SESSION_FILE.exists():
        raise CFNScraperError(
            f"Falta {SESSION_FILE} — loguearse manualmente en "
            f"{PROFILE_AUTH_URL} con un navegador normal y exportar las "
            "cookies de esa sesión con una extensión tipo Cookie-Editor. "
            "Ver SPECS.md §12 para el paso a paso."
        )

    raw_cookies = json.loads(SESSION_FILE.read_text())
    cookies = []
    for c in raw_cookies:
        same_site_raw = str(c.get("sameSite", "unspecified")).lower()
        cookies.append(
            {
                "name": c["name"],
                "value": c["value"],
                "domain": c["domain"],
                "path": c.get("path", "/"),
                "expires": c.get("expirationDate", c.get("expires", -1)) or -1,
                "httpOnly": bool(c.get("httpOnly", False)),
                "secure": bool(c.get("secure", True)),
                "sameSite": _SAMESITE_MAP.get(same_site_raw, "Lax"),
            }
        )
    context.add_cookies(cookies)


def _verify_session(page: Page, debug: bool) -> None:
    # domcontentloaded, no networkidle: esta página tiene widgets de
    # cookies/analytics con requests de fondo que nunca la dejan "quieta",
    # así que networkidle cuelga hasta el timeout la mitad de las veces.
    # El wait_for de _extract_text ya se encarga de esperar el contenido
    # real que necesitamos, no hace falta esperar a la red entera.
    page.goto(
        PROFILE_URL_TEMPLATE.format(cfn_id=SESSION_CHECK_CFN_ID),
        wait_until="domcontentloaded",
        timeout=45000,
    )
    _debug_dump(page, "01_session_check", debug)

    # si la sesión venció, Buckler's Boot Camp muestra este cartel en vez
    # del perfil real
    login_prompt = page.get_by_text(re.compile(r"must log in|iniciar sesi[oó]n", re.I))
    if login_prompt.count() > 0:
        _debug_dump(page, "99_session_expired", debug)
        raise CFNScraperError(
            "La sesión guardada venció o es inválida — repetir el login "
            f"manual y re-exportar las cookies a {SESSION_FILE}."
        )


def _extract_text(page: Page, selector: str) -> str | None:
    """Intenta extraer texto de un selector sin tumbar todo el scrape si
    ese campo puntual no matchea — mejor stats parciales que nada."""
    try:
        locator = page.locator(selector).first
        locator.wait_for(timeout=10000)
        return locator.inner_text().strip()
    except PlaywrightTimeout:
        return None


def get_player_stats(context: BrowserContext, cfn_id: str, debug: bool = False) -> dict:
    """Devuelve lo que se pudo extraer del perfil. Campos en None si su
    selector no matcheó — el llamador decide qué hacer con datos parciales.

    Selectores confirmados contra HTML real (capturas de Seba, 10-08-2026):
    el nombre del personaje vive en un <span> anidado dentro de un <p> que
    también dice "Selected Character" — hay que apuntar al span, no al p.
    El MR y el LP comparten la misma clase CSS para el número
    (character_point__TjhFi), así que hay que scopearlos por su <dd> padre
    (character_master_league / character_normal_league) para no
    confundirlos. El rango (MASTER, GRAND MASTER, etc.) se muestra como
    imagen, no como texto — no se extrae league_rank por ahora, sin una
    forma limpia de mapear el ícono a un nombre sin mantenimiento aparte.
    """
    page = context.new_page()
    result: dict = {
        "cfn_id": cfn_id,
        "display_name": None,
        "league_rank": None,
        "league_points": None,
        "master_rating": None,
        "character_name": None,
        "error": None,
    }
    try:
        # domcontentloaded, no networkidle — misma razón que en
        # _verify_session, esta página nunca queda de verdad "quieta"
        page.goto(
            PROFILE_URL_TEMPLATE.format(cfn_id=cfn_id),
            wait_until="domcontentloaded",
            timeout=45000,
        )
        _debug_dump(page, f"profile_{cfn_id}", debug)

        result["character_name"] = _extract_text(page, '[class*="character_name__"] span')

        mr_text = _extract_text(page, '[class*="character_master_league__"] [class*="character_point__"]')
        if mr_text:
            digits = re.sub(r"[^\d]", "", mr_text)
            result["master_rating"] = int(digits) if digits else None

        lp_text = _extract_text(page, '[class*="character_normal_league__"] [class*="character_point__"]')
        if lp_text:
            digits = re.sub(r"[^\d]", "", lp_text)
            result["league_points"] = int(digits) if digits else None

        if not any([result["character_name"], result["league_points"], result["master_rating"]]):
            result["error"] = "Ningún selector matcheó — revisar debug_output/ y ajustar"
    except Exception as exc:  # noqa: BLE001 — cualquier fallo acá es "no se pudo", no crash del refresh completo
        logger.warning("Fallo consultando CFN %s: %s", cfn_id, exc)
        result["error"] = str(exc)
    finally:
        page.close()
    return result


def refresh_all_players(cfn_ids: list[str], debug: bool = False) -> list[dict]:
    """Carga la sesión guardada una sola vez y consulta todos los CFN IDs
    con ella — evita repetir el login (que ni siquiera se automatiza) por
    jugador.

    `debug` solo controla si se guardan screenshots/HTML de cada paso en
    DEBUG_DIR — el navegador siempre corre headless. Un contenedor Docker
    no tiene servidor gráfico para mostrar una ventana, así que intentar
    `headless=False` ahí revienta con "Missing X server".
    """
    with Stealth().use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            locale="es-CL",
            timezone_id="America/Santiago",
            viewport={"width": 1366, "height": 768},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
        )

        _load_session_cookies(context)

        page = context.new_page()
        try:
            _verify_session(page, debug)
        finally:
            page.close()

        results = [get_player_stats(context, cfn_id, debug) for cfn_id in cfn_ids]

        browser.close()
        return results
