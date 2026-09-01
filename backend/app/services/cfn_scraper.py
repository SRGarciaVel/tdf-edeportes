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
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import (
    BrowserContext,
    Page,
    sync_playwright,
)
from playwright.sync_api import (
    TimeoutError as PlaywrightTimeout,
)
from playwright_stealth import Stealth

logger = logging.getLogger(__name__)

# el header del sitio muestra "UTC-4" (confirmado en captura) — se asume
# que las fechas del historial de partidas están en ese huso
_SITE_TIMEZONE = timezone(timedelta(hours=-4))

BASE_URL = "https://www.streetfighter.com/6/buckler"
PROFILE_AUTH_URL = f"{BASE_URL}/profile/auth"
PROFILE_URL_TEMPLATE = BASE_URL + "/profile/{cfn_id}"
# confirmado en el HTML real (history_01_after_click): la pestaña
# "History" es un link directo, no un tab que se abre por JS — no hace
# falta clickear nada, se navega derecho a esta URL
BATTLELOG_URL_TEMPLATE = BASE_URL + "/profile/{cfn_id}/battlelog"
# a diferencia de History, el sub-tab "Results" (donde viven Drive
# Impact/Perfect Parry/etc.) NO tiene URL propia — confirmado por Seba,
# 20-08-2026: clickear ese sub-tab no cambia la URL del navegador, solo
# cambia el contenido de la página. Por eso el scraper tiene que
# navegar acá y DESPUÉS clickear el sub-tab a mano (ver
# get_advanced_stats), no puede ir directo como con el historial.
# /en/ a propósito: nuestra sesión del navegador está en español
# (locale "es-CL", ver refresh_all_players) — el historial de partidas
# sale en español por eso ("VICTORIA"/"DERROTA"). Pero la única
# referencia real que tenemos de esta página es una captura en inglés
# (Seba, 20-08-2026), así que los selectores de texto de abajo están
# en inglés — forzar /en/ acá evita que fallen por un mismatch de
# idioma. Confirmado que el sitio soporta esta variante de URL (se vio
# en una captura anterior, /en/profile/.../battlelog).
STATS_URL_TEMPLATE = BASE_URL + "/en/profile/{cfn_id}/play"

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
    _dismiss_cookie_banner(page)
    _debug_dump(page, "01_session_check", debug)

    # si la sesión venció, Buckler's Boot Camp muestra este cartel en vez
    # del perfil real
    login_prompt = page.get_by_text(
        re.compile(r"must log in|iniciar sesi[oó]n", re.IGNORECASE)
    )
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
        _dismiss_cookie_banner(page)
        _debug_dump(page, f"profile_{cfn_id}", debug)

        result["character_name"] = _extract_text(
            page, '[class*="character_name__"] span'
        )

        mr_text = _extract_text(
            page, '[class*="character_master_league__"] [class*="character_point__"]'
        )
        if mr_text:
            digits = re.sub(r"[^\d]", "", mr_text)
            result["master_rating"] = int(digits) if digits else None

        lp_text = _extract_text(
            page, '[class*="character_normal_league__"] [class*="character_point__"]'
        )
        if lp_text:
            digits = re.sub(r"[^\d]", "", lp_text)
            result["league_points"] = int(digits) if digits else None

        if not any(
            [result["character_name"], result["league_points"], result["master_rating"]]
        ):
            result["error"] = (
                "Ningún selector matcheó — revisar debug_output/ y ajustar"
            )
    except Exception as exc:  # noqa: BLE001 — cualquier fallo acá es "no se pudo", no crash del refresh completo
        logger.warning("Fallo consultando CFN %s: %s", cfn_id, exc)
        result["error"] = str(exc)
    finally:
        page.close()
    return result


def _dismiss_cookie_banner(page: Page) -> None:
    """Cookiebot muestra un banner de cookies que tapa toda la pantalla y
    bloquea CUALQUIER click en la página — confirmado como la causa real
    de todos los fallos de "No se pudo sacar el CFN del rival" en el
    primer intento real (log de Seba, 19-08-2026): el intercepter en
    cada reintento era `CybotCookiebotDialogBodyBottomWrapper`, no un
    problema de selectores del modal ni del historial.

    Se saca del DOM directo en vez de buscarle el botón de "aceptar" —
    más robusto ante cambios de Cookiebot (no depende de un id de botón
    puntual, que puede variar entre versiones o según el idioma
    detectado), y no hace falta que el consentimiento "pegue" de
    verdad — esto es una sesión de scraping automatizada con cookies ya
    cargadas, no una persona navegando por primera vez.
    """
    try:
        page.evaluate(
            "document.querySelectorAll('[id^=\"Cybot\"]').forEach(el => el.remove())"
        )
    except Exception as exc:  # noqa: BLE001 — si el banner no está (ya lo sacamos antes, o esta carga no lo mostró), no pasa nada
        logger.debug("_dismiss_cookie_banner: %s", exc)


def _close_open_modal(page: Page) -> None:
    """Si el modal de detalle de una partida quedó abierto tapando la
    fila, lo cierra antes de seguir. Confirmado en log real de Seba
    (19-08-2026, segunda corrida, YA con el fix del banner de cookies
    aplicado): el bloqueador pasó a ser el modal mismo
    (battle_data_modal__AED01), abierto desde ANTES de intentar
    clickear la fila 1 de cada jugador — Escape solo no alcanza para
    cerrarlo de forma confiable.

    Va en capas, de más "prolijo" a más agresivo, en vez de saltar
    directo a sacarlo del DOM: la app parece ser Angular
    (ng-non-bindable en el HTML del sitio), y sacar un componente del
    DOM a mano sin pasar por el estado interno del framework puede
    dejar a Angular pensando que el modal sigue abierto — si eso pasa,
    el próximo click en una fila nueva podría no abrir nada porque el
    componente cree que ya hay uno mostrándose. Por eso Escape y un
    posible botón de cerrar se intentan primero (interacción real,
    respeta el ciclo de vida del framework); sacarlo del DOM queda como
    último recurso, solo si lo anterior no lo cerró de verdad.
    """
    modal = page.locator('[class*="battle_data_modal__"]').first
    try:
        if modal.count() == 0 or not modal.is_visible():
            return
    except Exception:  # noqa: BLE001
        return

    # capa 1: Escape
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    try:
        if modal.count() == 0 or not modal.is_visible():
            return
    except Exception:  # noqa: BLE001
        return

    # capa 2: un botón de cerrar explícito, si el modal tiene uno
    close_btn = modal.locator(
        '[class*="close" i], [aria-label*="close" i], [aria-label*="cerrar" i]'
    ).first
    if close_btn.count() > 0:
        try:
            close_btn.click(timeout=2000, force=True)
            page.wait_for_timeout(300)
        except Exception as exc:  # noqa: BLE001
            logger.debug("_close_open_modal: botón de cerrar falló: %s", exc)
    try:
        if modal.count() == 0 or not modal.is_visible():
            return
    except Exception:  # noqa: BLE001
        return

    # capa 3: último recurso garantizado — sacarlo del DOM a la fuerza
    logger.debug(
        "_close_open_modal: Escape y botón de cerrar no alcanzaron, sacando del DOM"
    )
    try:
        page.evaluate(
            "document.querySelectorAll('[class*=\"battle_data_modal__\"]').forEach(el => el.remove())"
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug("_close_open_modal: remove del DOM también falló: %s", exc)


def _extract_opponent_cfn_id(
    page: Page, row, own_cfn_id: str, debug: bool
) -> str | None:
    """Clickea la fila de una partida para abrir su modal de detalle,
    donde el nombre del rival SÍ es un link a su perfil (a diferencia de
    la fila de la lista, que solo lo muestra como texto plano sin link) —
    confirmado por capturas de Seba, 19-08-2026. Todavía NO confirmado
    contra HTML real del modal (solo capturas) — si esto no encuentra
    nada, correr con --debug y revisar debug_output/battlelog_{cfn_id}_*
    para ajustar.

    A propósito NO depende del nombre de ninguna clase CSS del modal
    (que puede estar hasheada/minificada distinto a la de la lista, y
    romperse en cualquier momento sin aviso): busca CUALQUIER link a
    /profile/{id} que aparezca en la página tras abrir el modal, y
    descarta el que sea el perfil propio — el que quede es el del rival.
    Más lento que un selector puntual (recorre todos los links de la
    página), pero mucho más resistente a que Capcom cambie nombres de
    clase internos.
    """
    try:
        # por si Cookiebot se reinyecta solo con un timer propio entre
        # una fila y la siguiente (algunos gestores de consentimiento lo
        # hacen) — barato, no hace nada si el banner no está
        _dismiss_cookie_banner(page)
        # si el modal de la fila anterior quedó abierto (Escape solo no
        # siempre alcanza, ver _close_open_modal), esto lo cierra ANTES
        # de intentar clickear la fila siguiente — confirmado en log
        # real que esto es lo que estaba bloqueando cada fila
        _close_open_modal(page)
        row.click(timeout=5000)
        # el modal anima al abrir — no hay selector confirmado todavía
        # para esperar "modal ya visible", así que se espera un tiempo
        # fijo generoso en vez de wait_for sobre algo que no sabemos que
        # existe
        page.wait_for_timeout(800)

        # BUG REAL encontrado por Seba (19-08-2026, tercera corrida): acá
        # buscaba en TODA la página (page.locator), no solo dentro del
        # modal — como la sesión está logueada como AckermanFG, hay casi
        # seguro un link permanente a "mi perfil" en el header/nav del
        # sitio que apunta a su CFN ID, y como ese link nunca coincide
        # con own_cfn_id (que es el ID del jugador que se está
        # escaneando, no el de la cuenta logueada), pasaba el filtro sin
        # querer. Resultado: TODOS los cruces detectados salían contra
        # AckermanFG sin importar a quién se le estuviera mirando el
        # historial — la firma inconfundible de este bug puntual.
        # Acotado al modal en sí, no debería volver a pasar.
        modal = page.locator('[class*="battle_data_modal__"]').first
        links = modal.locator('a[href*="/profile/"]')
        opponent_id = None
        for i in range(links.count()):
            href = links.nth(i).get_attribute("href") or ""
            match = re.search(r"/profile/(\d+)", href)
            if match and match.group(1) != own_cfn_id:
                opponent_id = match.group(1)
                break

        if debug:
            _debug_dump(page, f"battlelog_{own_cfn_id}_modal", debug)

        _close_open_modal(page)
        return opponent_id
    except Exception as exc:  # noqa: BLE001 — no encontrar el CFN del rival no debe tumbar la partida entera, se guarda igual sin ese dato
        logger.warning("No se pudo sacar el CFN del rival para %s: %s", own_cfn_id, exc)
        try:
            _close_open_modal(page)
        except Exception as close_exc:  # noqa: BLE001
            logger.debug("Cierre de respaldo también falló: %s", close_exc)
        return None


def get_match_history(
    context: BrowserContext,
    cfn_id: str,
    debug: bool = False,
    known_match_keys: frozenset[tuple[str, datetime, str]] = frozenset(),
) -> list[dict]:
    """Extrae las partidas de la primera página del historial
    (/profile/{cfn_id}/battlelog). No pagina — la primera página alcanza
    para calcular win rate de 1-3 días si el cron corre cada hora, no hace
    falta ir más atrás.

    `known_match_keys` son las partidas que YA están guardadas en la base
    de corridas anteriores (cfn_id, played_at, opponent_name) — para esas
    NO se abre el modal a buscar el CFN del rival (ya se buscó la vez que
    se vieron por primera vez, y el sitio muestra las mismas últimas N
    partidas en cada corrida, así que la mayoría de las filas de cada
    corrida ya son conocidas). Esto es lo que mantiene rápida la corrida
    del cron pese a que abrir el modal de cada partida es una interacción
    extra por fila — solo se paga ese costo en partidas genuinamente
    nuevas, normalmente un puñado por jugador por hora, no las ~10-20 de
    la página entera.

    Selectores confirmados contra HTML real (capturas de Seba, 11-08-2026):
    cada partida vive en un contenedor con clase
    `battle_data_inner_log__*`, con el nombre/fecha en
    `battle_data_name_space__*` y el resultado + personaje propio en
    `battle_data_player1__*` (el rival en `battle_data_player2__*`). El
    resultado se lee de la clase CSS del contenedor player1
    (`battle_data_win__*` / `battle_data_lose__*`), no del texto — más
    confiable si el sitio cambia de idioma. El personaje sale del `alt`
    de su imagen, no de texto visible.
    """
    page = context.new_page()
    matches: list[dict] = []
    try:
        page.goto(
            BATTLELOG_URL_TEMPLATE.format(cfn_id=cfn_id),
            wait_until="domcontentloaded",
            timeout=45000,
        )
        _dismiss_cookie_banner(page)
        # por si el sitio auto-muestra algo al cargar la página (todavía
        # no confirmado si eso es lo que pasa, o si es un modal que
        # quedó abierto de la corrida anterior) — no hace nada si no hay
        # ningún modal visible
        _close_open_modal(page)
        _debug_dump(page, f"battlelog_{cfn_id}", debug)

        rows = page.locator('[class*="battle_data_inner_log__"]')
        for i in range(rows.count()):
            row = rows.nth(i)
            try:
                date_text = (
                    row.locator('[class*="battle_data_date__"]')
                    .inner_text(timeout=3000)
                    .strip()
                )
                played_at = datetime.strptime(date_text, "%m/%d/%Y %H:%M").replace(
                    tzinfo=_SITE_TIMEZONE
                )

                opponent_name = (
                    row.locator(
                        '[class*="battle_data_name_p2__"] [class*="battle_data_name__"]'
                    )
                    .inner_text(timeout=3000)
                    .strip()
                )

                p1 = row.locator('[class*="battle_data_player1__"]').first
                p1_class = p1.get_attribute("class") or ""
                won = (
                    True
                    if "battle_data_win__" in p1_class
                    else (False if "battle_data_lose__" in p1_class else None)
                )
                character_name = p1.locator(
                    '[class*="battle_data_character__"] img'
                ).first.get_attribute("alt")

                p2 = row.locator('[class*="battle_data_player2__"]').first
                opponent_character = p2.locator(
                    '[class*="battle_data_character__"] img'
                ).first.get_attribute("alt")

                key = (cfn_id, played_at, opponent_name)
                opponent_cfn_id = None
                if key not in known_match_keys:
                    opponent_cfn_id = _extract_opponent_cfn_id(page, row, cfn_id, debug)

                matches.append(
                    {
                        "cfn_id": cfn_id,
                        "played_at": played_at,
                        "character_name": character_name,
                        "opponent_name": opponent_name,
                        "opponent_character": opponent_character,
                        "opponent_cfn_id": opponent_cfn_id,
                        "won": won,
                    }
                )
            except Exception as exc:  # noqa: BLE001 — una fila rara no debe tirar abajo el resto
                logger.warning(
                    "No se pudo parsear la partida %d de %s: %s", i, cfn_id, exc
                )
                continue
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_match_history falló para %s: %s", cfn_id, exc)
    finally:
        page.close()
    return matches


def _extract_labeled_value(page: Page, label: str) -> float | None:
    """Busca la fila que tiene exactamente ese texto de label y extrae
    el primer número que aparece en esa misma fila (asume label y valor
    conviven en un contenedor común, como se ve en la captura: "Perfect
    Parries" a la izquierda, "0.9 times" a la derecha, misma fila).

    NO confirmado contra HTML real todavía — solo tenemos una captura
    de pantalla, no el DOM (SPECS.md, conversación 20-08-2026). Revisar
    con --debug la primera corrida real y ajustar si el layout no
    calza. Devuelve None en vez de tirar error si no encuentra nada,
    para que un selector que falle no tumbe el resto del refresh."""
    try:
        row = page.locator(f':text-is("{label}")').locator("..").first
        text = row.inner_text(timeout=3000)
        match = re.search(r"([\d]+\.?[\d]*)", text.replace(label, "", 1))
        return float(match.group(1)) if match else None
    except Exception:  # noqa: BLE001 — selector sin confirmar contra HTML real, cualquier fallo debe devolver None, no tumbar el resto del refresh
        return None


def get_advanced_stats(
    context: BrowserContext, cfn_id: str, debug: bool = False
) -> dict:
    """ "Records" — promedios de Capcom sobre las últimas 100 partidas,
    de la pestaña Stats > Results del perfil. A diferencia de
    get_player_stats (estado actual: rango/LP/MR) esto es "cómo juega
    en promedio" — de acá sale el ranking de /jugadores tipo "el que
    más Drive Impact se come" (SPECS.md, conversación 20-08-2026).

    El sub-tab "Results" no tiene URL propia (confirmado por Seba) —
    hay que clickearlo a mano después de cargar la página, no se puede
    ir directo como con el historial de partidas.
    """
    page = context.new_page()
    result: dict = {
        "cfn_id": cfn_id,
        "drive_impact_received": None,
        "drive_parry_perfect": None,
        "drive_impact_punish_landed": None,
        "corner_time_opponent": None,
        "throws_landed": None,
    }
    try:
        page.goto(
            STATS_URL_TEMPLATE.format(cfn_id=cfn_id),
            wait_until="domcontentloaded",
            timeout=45000,
        )
        _dismiss_cookie_banner(page)
        _close_open_modal(page)

        # click al sub-tab "Results" — NO confirmado si ya viene
        # seleccionado por default o si hace falta clickearlo siempre;
        # si el locator no encuentra nada (count()==0) simplemente no
        # clickea nada y sigue, por si ya está activo
        results_tab = page.get_by_text("Results", exact=True).first
        if results_tab.count() > 0:
            results_tab.click(timeout=5000)
            page.wait_for_timeout(800)

        _debug_dump(page, f"stats_results_{cfn_id}", debug)

        result["drive_impact_received"] = _extract_labeled_value(page, "Received")
        result["drive_parry_perfect"] = _extract_labeled_value(page, "Perfect Parries")
        result["drive_impact_punish_landed"] = _extract_labeled_value(
            page, "Punish Counters Landed"
        )
        result["corner_time_opponent"] = _extract_labeled_value(
            page, "Time Spent Cornering Opponents"
        )
        result["throws_landed"] = _extract_labeled_value(page, "Times Landed")

    except Exception as exc:  # noqa: BLE001
        logger.warning("get_advanced_stats falló para %s: %s", cfn_id, exc)
    finally:
        page.close()
    return result


def get_character_win_rates(
    context: BrowserContext, cfn_id: str, debug: bool = False
) -> list[dict]:
    """Win rate TOTAL por personaje (histórico completo, no una ventana
    de días) - de la sub-pestaña "Characters" dentro de /play, filtro
    "Total" (no confundir con get_advanced_stats, que lee la sub-pestaña
    "Results" de esa misma URL - son dos secciones distintas de la
    misma página).

    NO confirmado contra HTML real todavía (mismo caso que
    get_advanced_stats) - Seba solo compartió la URL de referencia
    (streetfighter.com/6/buckler/es-es/profile/{cfn_id}/play), no una
    captura del HTML real de esta sub-pestaña puntual. Correr con
    --debug en la primera corrida real y ajustar selectores contra
    debug_output/ si esto vuelve todo vacío.

    Devuelve una lista de dicts (uno por personaje que la persona jugó
    alguna vez) con character_name/matches_played/win_rate - lista
    vacía si no se pudo leer nada (el llamador decide qué hacer, mismo
    criterio que el resto de este archivo: mejor datos parciales o
    vacíos que tumbar todo el refresh).
    """
    page = context.new_page()
    results: list[dict] = []
    try:
        page.goto(
            STATS_URL_TEMPLATE.format(cfn_id=cfn_id),
            wait_until="domcontentloaded",
            timeout=45000,
        )
        _dismiss_cookie_banner(page)
        _close_open_modal(page)
        # dump temprano, antes de cualquier click - si algo de lo de
        # abajo falla, igual queda un HTML/screenshot util para ajustar
        # selectores (antes se guardaba solo al final, y una corrida
        # real de Seba mostró que perdíamos el debug entero si el click
        # de "Total" fallaba antes de llegar a esa línea).
        _debug_dump(page, f"character_stats_{cfn_id}_00_loaded", debug)

        # click al sub-tab "Characters" - mismo patron que "Results" en
        # get_advanced_stats (no tiene URL propia, hay que clickearlo a
        # mano). Si no aparece, no clickea nada y sigue por si esta
        # sub-pestaña ya viene seleccionada por default.
        characters_tab = page.get_by_text("Characters", exact=True).first
        if characters_tab.count() > 0:
            characters_tab.click(timeout=5000)
            page.wait_for_timeout(800)

        # El filtro de ventana temporal ("Total" = historico completo,
        # que es lo que queremos acá, a diferencia de cfn_matches que
        # solo tiene lo que vimos nosotros desde que empezamos a
        # trackear) es un <select> NATIVO del HTML, no un botón/link -
        # confirmado por el error real en la corrida de Seba
        # (01-09-2026): "locator resolved to <option value="-1">Total
        # </option>". Un <option> dentro de un <select> no se puede
        # "clickear" con Playwright, hay que usar select_option().
        total_select = page.locator("select:has(option:text-is('Total'))").first
        if total_select.count() > 0:
            total_select.select_option(label="Total")
            page.wait_for_timeout(800)

        _debug_dump(page, f"character_stats_{cfn_id}", debug)

        # cada fila: nombre del personaje + win rate + cantidad de
        # partidas - selector generico por patron de clase (mismo
        # criterio que battle_data_* en get_match_history), ajustar
        # contra HTML real cuando se confirme.
        rows = page.locator('[class*="character_result_row__"]')
        count = rows.count()
        for i in range(count):
            try:
                row = rows.nth(i)
                character_name = (
                    row.locator('[class*="character_result_name__"]')
                    .inner_text(timeout=3000)
                    .strip()
                )
                win_rate_text = (
                    row.locator('[class*="character_result_winrate__"]')
                    .inner_text(timeout=3000)
                    .strip()
                )
                matches_text = (
                    row.locator('[class*="character_result_matches__"]')
                    .inner_text(timeout=3000)
                    .strip()
                )

                win_rate_digits = re.search(r"([\d]+\.?[\d]*)", win_rate_text)
                win_rate = (
                    float(win_rate_digits.group(1)) / 100 if win_rate_digits else None
                )
                matches_digits = re.search(r"(\d+)", matches_text)
                matches_played = (
                    int(matches_digits.group(1)) if matches_digits else None
                )

                results.append(
                    {
                        "cfn_id": cfn_id,
                        "character_name": character_name,
                        "matches_played": matches_played,
                        "win_rate": win_rate,
                    }
                )
            except Exception as exc:  # noqa: BLE001 — una fila rara no debe tumbar el resto
                logger.warning(
                    "No se pudo parsear la fila de personaje %d de %s: %s",
                    i,
                    cfn_id,
                    exc,
                )
                continue
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_character_win_rates falló para %s: %s", cfn_id, exc)
    finally:
        page.close()
    return results


def refresh_all_players(
    cfn_ids: list[str],
    debug: bool = False,
    known_match_keys: frozenset[tuple[str, datetime, str]] = frozenset(),
) -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    """Carga la sesión guardada una sola vez y consulta todos los CFN IDs
    con ella — evita repetir el login (que ni siquiera se automatiza) por
    jugador. Devuelve (perfiles, partidas, records, win_rates_por_personaje)
    - un solo browser/sesión para los cuatro, no se abre una sesión aparte
    para cada tipo de dato.

    `known_match_keys` se pasa tal cual a get_match_history — ver ahí para
    qué sirve (evitar el costo extra de abrir el modal de detalle en
    partidas ya vistas antes).

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

        profiles = []
        matches = []
        advanced_stats = []
        character_stats = []
        for cfn_id in cfn_ids:
            profiles.append(get_player_stats(context, cfn_id, debug))
            matches.extend(get_match_history(context, cfn_id, debug, known_match_keys))
            advanced_stats.append(get_advanced_stats(context, cfn_id, debug))
            character_stats.extend(get_character_win_rates(context, cfn_id, debug))

        browser.close()
        return profiles, matches, advanced_stats, character_stats
