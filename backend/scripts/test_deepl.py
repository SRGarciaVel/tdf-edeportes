"""Prueba puntual, NO parte del proyecto todavía — prueba la conexión a
DeepL directo, mostrando el error real si algo falla (translate_to_spanish
en producción esconde los errores a propósito, para que un problema de
traducción no tumbe el guardado de todo el parche — acá lo mostramos
para diagnosticar).

Uso:
    docker compose exec backend python scripts/test_deepl.py
"""

import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import deepl

from app.core.config import settings


def main() -> None:
    key = settings.deepl_api_key
    if not key:
        print("✗ DEEPL_API_KEY no está seteada (vacía) — revisá el .env")
        return

    masked = f"{key[:6]}...{key[-6:]}" if len(key) > 12 else "(muy corta, rara)"
    print(f"Clave detectada: {masked} (largo: {len(key)} caracteres)")
    print(f"Termina en ':fx': {key.endswith(':fx')}")

    try:
        translator = deepl.Translator(key)

        print("\nProbando GET /usage (chequea la cuenta sin gastar caracteres)...")
        usage = translator.get_usage()
        print(
            f"✓ Cuenta válida. Uso actual: {usage.character.count}/{usage.character.limit} caracteres"
        )

        print("\nProbando una traducción real de prueba...")
        result = translator.translate_text(
            "Standing Medium Punch was adjusted.",
            source_lang="EN",
            target_lang="ES",
        )
        print(f"✓ Traducción de prueba: {result.text!r}")

    except Exception:  # noqa: BLE001 — a propósito, este script es para VER el error, no esconderlo
        print("\n✗ FALLÓ — acá está el error completo, sin esconder nada:\n")
        traceback.print_exc()


if __name__ == "__main__":
    main()
