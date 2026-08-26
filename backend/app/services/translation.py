"""Traducción EN->ES para las notas de parche de SF6, con protección de
terminología técnica de fighting games — así habla la comunidad en
español también (conversación de diseño, 21-08-2026): "Perfect Parry",
"Drive Rush", nombres de movimientos, etc. se quedan en inglés, solo se
traduce la prosa de lectura alrededor.

Usa DeepL (`tag_handling="xml"` + `ignore_tags`) para proteger esos
términos durante la traducción, en vez de intentar post-procesar el
resultado — más confiable, DeepL nunca toca lo que está envuelto en
esas etiquetas.
"""

import logging
import re

import deepl

from app.core.config import settings

logger = logging.getLogger(__name__)

# términos fijos de FGC que se quedan en inglés siempre, sin importar
# personaje/movimiento puntual — lista abierta, se puede sumar más acá
# si aparecen otros en parches futuros que no queden bien traducidos
FGC_TERMS = [
    "Drive Rush",
    "Drive Parry",
    "Drive Impact",
    "Drive Reversal",
    "Drive Gauge",
    "Perfect Parry",
    "Punish Counter",
    "Overdrive",
    "Super Art",
    "SA Gauge",
    "Modern Control",
    "Modern Controls",
    "Classic Control",
    "Classic Controls",
    "Assisted Combo",
    "Assisted Combos",
    "hurtbox",
    "hitbox",
    "blockstun",
    "hitstun",
    "startup",
    "recovery",
    "Punish Counters",
    "Counter Hit",
    "Drive Cancel",
]

_translator: deepl.Translator | None = None


def _get_translator() -> deepl.Translator | None:
    global _translator
    if not settings.deepl_api_key:
        return None
    if _translator is None:
        _translator = deepl.Translator(settings.deepl_api_key)
    return _translator


def _protect_terms(text: str, extra_terms: list[str]) -> str:
    """Envuelve cada término (la lista fija + los nombres de movimientos
    reales de este personaje/parche) en <keep>, para que DeepL no los
    traduzca con tag_handling="xml"/ignore_tags. Todo en una sola pasada
    de regex (alternación, ordenada de término más largo a más corto) —
    hacerlo en un loop término por término reescaneaba el texto ya
    modificado en cada vuelta, y un término corto (ej. "Overdrive")
    volvía a matchear DENTRO de uno largo ya envuelto (ej. "Overdrive
    Impaler"), armando un <keep> anidado adentro de otro (bug real
    encontrado y arreglado el mismo día, 21-08-2026)."""
    terms = sorted({t for t in FGC_TERMS + extra_terms if t}, key=len, reverse=True)
    if not terms:
        return text
    pattern = re.compile("|".join(re.escape(t) for t in terms), re.IGNORECASE)
    return pattern.sub(lambda m: f"<keep>{m.group(0)}</keep>", text)


def translate_to_spanish(text: str, extra_terms: list[str] | None = None) -> str:
    """Traduce un texto de inglés a español, protegiendo terminología
    técnica de FGC. Si no hay DEEPL_API_KEY configurada, o si la
    traducción falla por cualquier motivo (cuota agotada, red, etc.),
    devuelve el texto ORIGINAL sin traducir — nunca debe tumbar el
    resto del refresh de notas de parche por un problema de traducción
    puntual."""
    if not text or not text.strip():
        return text

    translator = _get_translator()
    if translator is None:
        return text

    try:
        protected = _protect_terms(text, extra_terms or [])
        result = translator.translate_text(
            protected,
            source_lang="EN",
            target_lang="ES",
            tag_handling="xml",
            ignore_tags=["keep"],
            formality="less",  # tuteo, no "usted" — mismo criterio de todo el sitio
        )
        translated = result.text
        return translated.replace("<keep>", "").replace("</keep>", "")
    except Exception as exc:  # noqa: BLE001 — un fallo de traducción no debe tumbar el refresh completo
        logger.warning("translate_to_spanish falló: %s", exc)
        return text
