from pydantic import BaseModel, Field

# ninguna tanda de preguntas del test supera esto -- tope de seguridad
# generoso para no aceptar arrays gigantes en el body sin sentido
MAX_ANSWERS = 20


class QuestionOption(BaseModel):
    texto: str


class Question(BaseModel):
    texto: str
    opciones: list[str]


class QuestionsResponse(BaseModel):
    """Todo lo que el frontend necesita para renderizar el test
    completo de una sola vez — las preguntas de Nivel 2 vienen
    agrupadas por familia/subfamilia porque cuál tanda mostrar
    depende del resultado de un paso anterior."""

    nivel1: list[Question]
    nivel1_5: Question
    nivel2_por_familia: dict[str, list[Question]]
    era_generica: list[Question]
    era_ken: Question


class ResolveFamilyRequest(BaseModel):
    answers: list[int] = Field(min_length=1, max_length=MAX_ANSWERS)


class ResolveFamilyResponse(BaseModel):
    family: str
    needs_subfamily_split: bool


class ResolveSubfamilyRequest(BaseModel):
    answer: int


class ResolveSubfamilyResponse(BaseModel):
    subfamily: str


class ResolveCharacterRequest(BaseModel):
    family_key: str
    answers: list[int] = Field(min_length=1, max_length=MAX_ANSWERS)


class ResolveCharacterResponse(BaseModel):
    character: str
    needs_era: bool
    # solo viene con valor si needs_era es False -- el resultado ya
    # está cerrado en este paso y quedó guardado (si había sesión)
    final_result: str | None = None
    # "también te pareces a..." -- los 2 personajes más cercanos del
    # roster completo (82), sin contar al ganador ni su otra era si
    # tiene split. Vacío mientras needs_era sea True, porque recién
    # ahí se sabe el vector final de verdad (ver resolve-era)
    neighbors: list[str] = []


class ResolveEraRequest(BaseModel):
    character: str
    answers: list[int] = Field(min_length=1, max_length=MAX_ANSWERS)


class ResolveEraResponse(BaseModel):
    final_result: str
    neighbors: list[str] = []


class CharacterStat(BaseModel):
    character_name: str
    count: int
    percentage: float
    family_key: str | None = None


class StatsResponse(BaseModel):
    total_results: int
    by_character: list[CharacterStat]
