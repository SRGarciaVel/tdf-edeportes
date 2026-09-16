"""Motor de matching del test de personalidad SF — implementa el
pipeline de 3 niveles ya validado (ver sf_personality_data.py para el
detalle de cada resultado de validación):

    Nivel 1 (familia) → Nivel 1.5 (solo si "libres") → Nivel 2
    (personaje dentro de la familia/subfamilia) → Nivel 3 (solo si el
    personaje tiene split por era)

Todo por distancia euclidiana sobre el vector de 5 ejes, salvo la era
de Ken, que es un mapeo directo (ver comentario en sf_personality_data
sobre por qué ese caso no pasa por vectores).
"""

import math

from app.services.sf_personality_data import (
    CHARACTERS,
    ERA_QUESTIONS_GENERIC,
    ERA_SPLITS,
    FAMILIES,
    KEN_ERA_QUESTION,
    LIBRES_CERCANOS,
    LIBRES_SOLITARIOS,
    NIVEL1_5_QUESTION,
    NIVEL1_QUESTIONS,
    NIVEL2_QUESTIONS,
    Vector,
)


class PersonalityTestError(Exception):
    """Respuestas con forma inválida (índice de opción fuera de rango,
    cantidad de respuestas que no calza con la cantidad de preguntas,
    etc.) — nunca datos de personaje mal formados, eso ya se verifica
    aparte al cargar el módulo de datos."""


def _distance(v1: Vector, v2: Vector) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2)))


def _family_centroid(members: list[str]) -> Vector:
    vectors = [CHARACTERS[m] for m in members]
    n = len(vectors)
    return tuple(sum(v[i] for v in vectors) / n for i in range(5))  # type: ignore[return-value]


# centroides calculados una sola vez al cargar el módulo, no en cada
# request — las familias no cambian en tiempo de ejecución
_FAMILY_CENTROIDS: dict[str, Vector] = {
    fam: _family_centroid(miembros) for fam, miembros in FAMILIES.items()
}


def _accumulate(questions: list[dict], answer_indices: list[int]) -> Vector:
    """Suma los deltas de las opciones elegidas. Levanta
    PersonalityTestError si la cantidad de respuestas no calza con la
    cantidad de preguntas, o si algún índice está fuera de rango —
    nunca falla en silencio con un vector incompleto."""
    if len(answer_indices) != len(questions):
        raise PersonalityTestError(
            f"Se esperaban {len(questions)} respuestas, llegaron {len(answer_indices)}"
        )
    vector = [0.0] * 5
    for pregunta, idx in zip(questions, answer_indices):
        opciones = pregunta["opciones"]
        if not (0 <= idx < len(opciones)):
            raise PersonalityTestError(
                f"Índice de opción {idx} fuera de rango (0-{len(opciones) - 1})"
            )
        _, delta = opciones[idx]
        vector = [v + d for v, d in zip(vector, delta)]
    return tuple(vector)  # type: ignore[return-value]


def resolve_family(nivel1_answers: list[int]) -> str:
    """Nivel 1 — devuelve la clave de familia
    ("disciplinados"/"atormentados"/"protectores"/"ambiciosos"/"libres").
    Validado: 5/5."""
    vector = _accumulate(NIVEL1_QUESTIONS, nivel1_answers)
    return min(
        _FAMILY_CENTROIDS, key=lambda fam: _distance(vector, _FAMILY_CENTROIDS[fam])
    )


def resolve_libres_subfamily(nivel1_5_answer: int) -> str:
    """Nivel 1.5 — solo se llama si `resolve_family` devolvió
    "libres". Devuelve "libres_cercanos" o "libres_solitarios"."""
    vector = _accumulate([NIVEL1_5_QUESTION], [nivel1_5_answer])
    cercanos_centroid = _family_centroid(LIBRES_CERCANOS)
    solitarios_centroid = _family_centroid(LIBRES_SOLITARIOS)
    if _distance(vector, cercanos_centroid) <= _distance(vector, solitarios_centroid):
        return "libres_cercanos"
    return "libres_solitarios"


def _find_neighbors(vector: Vector, exclude: set[str], top_n: int = 2) -> list[str]:
    """Los personajes más parecidos al vector del usuario, comparando
    contra los 82 completos (no solo la familia resuelta) — para "también
    te pareces a...", pedido de Seba (14-09-2026). Nunca incluye al
    ganador ni a su otra era (si tiene split) — no tiene sentido decirle
    a alguien que "también se parece" a la otra versión de sí mismo."""
    candidatos = [name for name in CHARACTERS if name not in exclude]
    ordenados = sorted(candidatos, key=lambda name: _distance(vector, CHARACTERS[name]))
    return ordenados[:top_n]


def resolve_character(
    family_key: str, nivel2_answers: list[int]
) -> tuple[str, list[str]]:
    """Nivel 2 — devuelve (personaje base sin era, vecinos más
    parecidos). El nombre viene sin era (ej. "Ryu" en vez de "Ryu
    (SF6)") dentro de la familia/subfamilia ya resuelta. Resultado de
    validación por familia documentado en
    sf_personality_data.NIVEL2_QUESTIONS."""
    questions = NIVEL2_QUESTIONS[family_key]
    vector = _accumulate(questions, nivel2_answers)

    if family_key == "libres_cercanos":
        candidates = LIBRES_CERCANOS
    elif family_key == "libres_solitarios":
        candidates = LIBRES_SOLITARIOS
    else:
        candidates = FAMILIES[family_key]

    winner = min(candidates, key=lambda name: _distance(vector, CHARACTERS[name]))
    exclude = {winner}
    # si el ganador es una de las dos eras de un split, devolver el
    # nombre BASE (sin era) -- la era se resuelve aparte en Nivel 3
    base_name = winner
    for base, (temprana, tardia) in ERA_SPLITS.items():
        if winner in (temprana, tardia):
            base_name = base
            exclude = {temprana, tardia}
            break

    neighbors = _find_neighbors(vector, exclude)
    return base_name, neighbors


def resolve_era(base_character: str, era_answers: list[int]) -> tuple[str, list[str]]:
    """Nivel 3 — solo se llama si `resolve_character` devolvió uno de
    los 5 personajes con split (ver ERA_SPLITS). Devuelve (nombre
    completo con era, ej. "Ryu (SF6)", vecinos más parecidos). Ken usa
    mapeo directo (2/2 por diseño, 1 sola pregunta → `era_answers` con
    1 elemento), los otros 4 comparten las 2 preguntas genéricas de
    vectores (8/8 validado → `era_answers` con 2 elementos, una
    respuesta real por pregunta)."""
    temprana, tardia = ERA_SPLITS[base_character]

    if base_character == "Ken":
        if len(era_answers) != 1:
            raise PersonalityTestError(
                f"La era de Ken usa 1 sola pregunta, llegaron {len(era_answers)} respuestas"
            )
        _, era_key = KEN_ERA_QUESTION["opciones"][era_answers[0]]
        final = temprana if era_key == "temprana" else tardia
        # Ken no pasa por vectores para la era -- para los vecinos, se
        # usa el vector de la era que gano (es lo mas parecido a un
        # "vector real" que tenemos en este caso puntual)
        neighbors = _find_neighbors(CHARACTERS[final], {temprana, tardia})
        return final, neighbors

    # Ryu/Chun-Li/Sagat/Karin: 2 preguntas genericas, cada una con su
    # propia respuesta real (no la misma respuesta repetida dos veces)
    vector = _accumulate(ERA_QUESTIONS_GENERIC, era_answers)
    final = (
        temprana
        if _distance(vector, CHARACTERS[temprana])
        <= _distance(vector, CHARACTERS[tardia])
        else tardia
    )
    neighbors = _find_neighbors(vector, {temprana, tardia})
    return final, neighbors


def needs_era_question(base_character: str) -> bool:
    return base_character in ERA_SPLITS


def needs_libres_split(family_key: str) -> bool:
    return family_key == "libres"
