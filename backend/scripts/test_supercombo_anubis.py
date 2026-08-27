"""Prueba puntual, NO parte del proyecto todavía — solo para confirmar
si un navegador real (Playwright) puede pasar el desafío anti-bot
"Anubis" de SuperCombo Wiki, algo que una llamada HTTP simple (como la
que usamos para Meta Actual/Notas de Parche) no puede hacer, ya que
Anubis exige ejecutar JavaScript real (conversación de diseño,
21-08-2026).

Uso:
    docker compose exec backend python scripts/test_supercombo_anubis.py

Si esto funciona, confirma que SuperCombo Wiki es viable con el mismo
enfoque pesado que ya usamos para el tracker de CFN. Si falla, queda
descartado (o necesitaría investigar más a fondo por qué).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from playwright.sync_api import sync_playwright

from app.services.cfn_scraper import Stealth


def main() -> None:
    url = "https://wiki.supercombo.gg/w/Street_Fighter_6/Cammy"
    print(f"Probando acceso real a: {url}")

    with Stealth().use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        try:
            page.goto(url, timeout=45000, wait_until="networkidle")

            # las pantallas de espera de Cloudflare a veces se resuelven
            # solas en unos segundos, sin necesitar nada especial — se
            # le da margen antes de revisar el contenido real (bug
            # encontrado en la primera versión de este script: revisaba
            # el contenido apenas cargaba, sin esperar a que terminara
            # la verificación, y daba un falso positivo)
            page.wait_for_timeout(8000)

            title = page.title()
            content = page.content()
            print(f"\nTítulo de la página: {title!r}")

            blocked_markers = [
                "Oh noes",
                "Anubis",
                "Just a moment",
                "Performing security verification",
                "Checking your browser",
            ]
            found_marker = next((m for m in blocked_markers if m in content), None)

            if found_marker:
                print(
                    f"✗ BLOQUEADO — se encontró el texto {found_marker!r} en la "
                    "página, sigue sin llegar al contenido real."
                )
            else:
                sample = page.locator("body").inner_text()[:400]
                print("✓ PASÓ el desafío — esto es lo que se ve del contenido real:\n")
                print(sample)
        except Exception as exc:  # noqa: BLE001 — script de prueba puntual, no parte del refresh normal
            print(f"✗ ERROR al intentar cargar la página: {exc}")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
