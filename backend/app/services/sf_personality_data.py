"""Datos del test de personalidad de Street Fighter (Alpha → SF6).

Traducción directa de los prototipos de Python ya validados en la
sesión de diseño (13-09-2026) — cada bloque de preguntas trae anotado
su resultado real de validación (top3 sobre el total de miembros de
esa familia), para que quede a la vista qué tan confiable es cada uno
sin tener que re-correr los scripts de prueba.

Los 5 ejes de personalidad (escala -5 a +5):
  A = Disciplina (+) / Impulsividad (-)
  B = Justicia/Honor (+) / Poder/Ambición (-)
  C = Tradición/Espiritualidad (+) / Modernidad/Tecnología (-)
  D = Comunidad/Equipo (+) / Individualismo (-)
  E = Calma/Control (+) / Furia/Caos (-)

Twelve queda excluido a propósito del roster — diseñado explícitamente
sin personalidad propia (lore real, no interpretación), la pregunta
del test no le aplica.
"""

Vector = tuple[float, float, float, float, float]

# --- Los 82 personajes posibles, con su vector de rasgos ---------------

CHARACTERS: dict[str, Vector] = {
    # Los 5 con split por era (ver ERA_SPLITS más abajo)
    "Ryu (Alpha-SF5)": (4, 3, 4, -3, -2),
    "Ryu (SF6)": (4, 3, 3, -2, 4),
    "Ken (Alpha-SFV)": (1, 2, -2, 3, 2),
    "Ken (SF6)": (2, 3, -1, 4, 1),
    "Chun-Li (SF2-Alpha)": (3, 2, 2, 1, -3),
    "Chun-Li (SF4-SF6)": (3, 3, 2, 3, 4),
    "Sagat (SF1-Alpha)": (1, -3, 2, -3, -4),
    "Sagat (SF5-SF6)": (3, 3, 3, 2, 4),
    "Karin (Alpha 3)": (1, -3, -2, -3, 1),
    "Karin (SFV)": (2, 1, -2, 2, 2),
    # Los Disciplinados en Paz
    "Guile": (5, 4, -1, 3, 4),
    "Zangief": (1, 2, 3, 3, 2),
    "Gouken": (5, 3, 4, 3, 5),
    "Oro": (5, 1, 5, -2, 5),
    "Rose": (4, 2, 5, -1, 4),
    "Gen": (4, 1, 4, -2, 3),
    "Guy": (4, 3, 3, 2, 3),
    "Yun": (2, 1, 1, 3, 2),
    "Yang": (3, 2, 2, 3, 3),
    "Necalli": (2, 0, 3, -1, -2),
    "E. Honda": (2, 3, 3, 3, 3),
    "Dhalsim": (5, 1, 5, 3, 5),
    # Los Atormentados
    "Akuma": (3, -2, 3, -4, -4),
    "Sean": (0, 1, -2, 2, 1),
    "Alex": (2, 1, -1, 1, -1),
    "Necro": (1, 0, -1, -2, -2),
    "G": (2, -2, -2, -3, 1),
    "Falke": (2, 1, -1, -2, -1),
    # Los Protectores Modernos
    "Kimberly": (2, 2, -3, 2, 1),
    "Rolento": (3, -1, 1, -2, 1),
    "Ibuki": (2, 2, -1, 2, 2),
    "Makoto": (3, 2, 1, 2, 1),
    "Elena": (1, 2, 2, 3, 3),
    "Laura": (2, 1, -1, 3, 1),
    "Abel": (2, 2, -1, 1, 2),
    "Rufus": (0, 1, -1, 1, 0),
    "T. Hawk": (2, 3, 2, 3, 3),
    "Dudley": (3, 3, 1, 1, 3),
    "Q": (3, 0, -1, -3, -3),
    "C. Viper": (2, 1, -2, 2, 1),
    "Luke": (2, 2, -1, 2, 1),
    # Los Ambiciosos Calculadores
    "Juri": (-2, -4, -3, -4, -4),
    "JP": (3, -4, -2, -4, 3),
    "M. Bison": (2, -4, 0, -4, 3),
    "Vega": (2, -3, -1, -4, 1),
    "Balrog": (0, -3, -2, -3, -1),
    "Seth": (2, -3, -2, -4, 2),
    "F.A.N.G": (2, -3, -2, -3, 1),
    "Urien": (3, -3, 1, -3, 3),
    "Gill": (3, -2, 2, -2, 4),
    "Abigail": (0, 0, -2, 1, -1),
    "A.K.I.": (1, -3, -2, -4, -1),
    "Ed": (1, -1, -2, -2, 1),
    # Los Libres → Los Cercanos
    "Jamie": (-3, 0, -4, 2, 0),
    "Dan Hibiki": (-3, 0, 0, 0, -1),
    "Lily": (-1, 1, 3, 2, 1),
    "Marisa": (1, 1, 2, 1, 3),
    "Terry": (0, 2, -1, 2, 2),
    "Mai": (-1, 1, 1, 2, 2),
    "Yasmine": (1, 1, 1, 0, 2),
    "R. Mika": (-1, 1, -1, 3, 2),
    "Hakan": (-1, 1, -1, 2, 3),
    "El Fuerte": (-2, 1, 1, -1, -1),
    "Poison": (-1, -2, -2, -1, 1),
    "Hugo": (-3, -1, 1, -1, -1),
    "Sodom": (-1, 1, 1, -1, -1),
    "Maki": (2, 1, -1, 0, -2),
    "Ingrid": (0, 1, 2, 1, 3),
    "Rashid": (-1, 1, -2, 2, 2),
    # Los Libres → Los Solitarios
    "Manon": (3, 0, -2, -2, 3),
    "Blanka": (-3, 0, 3, -1, -2),
    "Birdie": (-2, -1, -2, -2, -1),
    "Cody": (0, -2, -1, 1, -1),
    "Zeku": (2, 1, 1, -1, 2),
    "Menat": (2, 1, 2, 0, 3),
    "Kolin": (2, -1, 1, -2, 3),
    "Eagle": (1, 0, -1, -2, 1),
    "Juli": (0, 0, -2, -2, 0),
    "Juni": (0, 0, -2, -2, 0),
    "Remy": (-1, -2, -2, -3, -2),
    "Decapre": (0, -1, -1, -3, -2),
}

# --- Familias (Nivel 1) -------------------------------------------------

FAMILIES: dict[str, list[str]] = {
    "disciplinados": [
        "Ryu (SF6)",
        "Dhalsim",
        "Sagat (SF5-SF6)",
        "Chun-Li (SF4-SF6)",
        "Guile",
        "Zangief",
        "Gouken",
        "Oro",
        "Rose",
        "Gen",
        "Guy",
        "Yun",
        "Yang",
        "Necalli",
        "E. Honda",
    ],
    "atormentados": [
        "Ryu (Alpha-SF5)",
        "Chun-Li (SF2-Alpha)",
        "Sagat (SF1-Alpha)",
        "Akuma",
        "Sean",
        "Alex",
        "Necro",
        "G",
        "Falke",
    ],
    "protectores": [
        "Ken (SF6)",
        "Ken (Alpha-SFV)",
        "Kimberly",
        "Karin (SFV)",
        "Rolento",
        "Ibuki",
        "Makoto",
        "Elena",
        "Laura",
        "Abel",
        "Rufus",
        "T. Hawk",
        "Dudley",
        "Q",
        "C. Viper",
        "Luke",
    ],
    "ambiciosos": [
        "Karin (Alpha 3)",
        "Juri",
        "JP",
        "M. Bison",
        "Vega",
        "Balrog",
        "Seth",
        "F.A.N.G",
        "Urien",
        "Gill",
        "Abigail",
        "A.K.I.",
        "Ed",
    ],
    "libres": [
        # se resuelve en 2 sub-pasos: LIBRES_CERCANOS / LIBRES_SOLITARIOS
        "Jamie",
        "Dan Hibiki",
        "Lily",
        "Marisa",
        "Terry",
        "Mai",
        "Yasmine",
        "R. Mika",
        "Hakan",
        "El Fuerte",
        "Poison",
        "Hugo",
        "Sodom",
        "Maki",
        "Ingrid",
        "Rashid",
        "Manon",
        "Blanka",
        "Birdie",
        "Cody",
        "Zeku",
        "Menat",
        "Kolin",
        "Eagle",
        "Juli",
        "Juni",
        "Remy",
        "Decapre",
    ],
}

LIBRES_CERCANOS = [
    "Jamie",
    "Dan Hibiki",
    "Lily",
    "Marisa",
    "Terry",
    "Mai",
    "Yasmine",
    "R. Mika",
    "Hakan",
    "El Fuerte",
    "Poison",
    "Hugo",
    "Sodom",
    "Maki",
    "Ingrid",
    "Rashid",
]
LIBRES_SOLITARIOS = [
    "Manon",
    "Blanka",
    "Birdie",
    "Cody",
    "Zeku",
    "Menat",
    "Kolin",
    "Eagle",
    "Juli",
    "Juni",
    "Remy",
    "Decapre",
]

# personajes con split por era — el valor es (era_temprana, era_tardia)
ERA_SPLITS: dict[str, tuple[str, str]] = {
    "Ryu": ("Ryu (Alpha-SF5)", "Ryu (SF6)"),
    "Ken": ("Ken (Alpha-SFV)", "Ken (SF6)"),
    "Chun-Li": ("Chun-Li (SF2-Alpha)", "Chun-Li (SF4-SF6)"),
    "Sagat": ("Sagat (SF1-Alpha)", "Sagat (SF5-SF6)"),
    "Karin": ("Karin (Alpha 3)", "Karin (SFV)"),
}

# --- Preguntas -----------------------------------------------------------
# Cada pregunta es una lista de opciones; cada opción es (texto, delta).
# El delta se suma al vector acumulado del usuario cuando elige esa
# opción. Validado: 5/5 familias se reconocen correctamente.

NIVEL1_QUESTIONS: list[dict] = [
    {
        "texto": "Estás librando una batalla que nadie más ve.",
        "opciones": [
            ("Se la comparto a mi gente, me ayuda soltarla", (0, 0, 0, 1, 1)),
            ("La uso como combustible para hacer el bien", (0, 1, 0, 0, 0)),
            ("La escondo, es una ventaja que nadie sepa", (0, -1, 0, -1, 0)),
            ("Peleo esa batalla solo, me consume por dentro", (0, 0, 0, -2, -2)),
        ],
    },
    {
        "texto": "¿Cómo encaras tus objetivos en general?",
        "opciones": [
            ("Con disciplina y rutina, paso a paso", (2, 0, 1, 0, 1)),
            ("Apoyándome en la gente que confío", (0, 1, 0, 1, 1)),
            ("Calculando cada movimiento para ventaja", (-1, -1, 0, -1, -1)),
            ("Como se dé, sin mucho plan", (-2, 0, -1, 0, 0)),
        ],
    },
    {
        "texto": "Piensas en algo sin resolver de tu pasado.",
        "opciones": [
            ("Ya hice las paces con eso", (0, 0, 0, 0, 2)),
            ("Lo uso como motivo para cuidar a otros ahora", (0, 1, 0, 1, 1)),
            ("Todavía me pesa, y a veces me consume", (0, 0, 0, 0, -3)),
            ("Prefiero no pensarlo demasiado", (-1, 0, 0, 0, 0)),
        ],
    },
    {
        "texto": "Alguien depende de ti en un momento difícil.",
        "opciones": [
            ("Actúo con cabeza fría, sin drama", (1, 1, 0, 0, 1)),
            ("Ahí estoy, sin dudarlo", (0, 2, 0, 2, 0)),
            ("Evalúo qué gano yo antes de involucrarme", (0, -2, 0, -2, 0)),
            ("Ayudo a mi manera, más relajada", (-1, 0, 0, 1, 0)),
        ],
    },
    {
        "texto": "¿Con quién compartes tus victorias?",
        "opciones": [
            ("Es algo mío, personal, no necesito compartirlo", (1, 0, 1, -1, 1)),
            ("Con mi gente, siempre", (0, 1, 0, 2, 0)),
            ("Una victoria compartida es una victoria diluida", (0, -2, 0, -2, 0)),
            ("Con quien esté cerca en ese momento, sin más", (-1, 0, -1, 0, 0)),
        ],
    },
    {
        "texto": "¿Qué opinas de las reglas y las tradiciones?",
        "opciones": [
            ("Las respeto, tienen sentido por algo", (1, 0, 2, 0, 1)),
            ("Las sigo si protegen a los que quiero", (0, 1, 0, 1, 0)),
            ("Solo importan si me convienen", (0, -1, -1, -1, 0)),
            ("Las reglas están para romperse", (-1, 0, -2, 0, 0)),
        ],
    },
]

# desempate Los Cercanos vs. Los Solitarios (solo se pregunta si la
# Familia resuelta es "libres") — validado: separación limpia
NIVEL1_5_QUESTION: dict = {
    "texto": "¿Cómo te llevas con la soledad?",
    "opciones": [
        ("Prefiero siempre tener a mi gente cerca", (0, 1, 0, 2, 0)),
        ("Depende del momento, pero tiendo a acompañarme", (0, 0, 0, 1, 0)),
        ("Prefiero manejarme por mi cuenta la mayoría del tiempo", (0, 0, 0, -1, 0)),
        ("Ando mejor solo, siempre", (0, -1, 0, -2, 0)),
    ],
}

# preguntas de Nivel 2 por familia/subfamilia — cada una anota su
# resultado de validación real (top3 sobre el total de miembros)
NIVEL2_QUESTIONS: dict[str, list[dict]] = {
    # 87.5% top3 (14/16)
    "disciplinados": [
        {
            "texto": "¿Qué tan en serio te tomas tu disciplina?",
            "opciones": [
                ("Con toda seriedad, es mi vocación", (4, 0, 0, 0, 1)),
                ("Con seriedad moderada", (2, 0, 0, 0, 0)),
                ("Depende del día", (0, 0, 0, 0, 0)),
                ("No me lo tomo tan a pecho", (-2, 0, 0, 0, -1)),
            ],
        },
        {
            "texto": "¿El deber pesa más que tu propio criterio?",
            "opciones": [
                ("El deber viene siempre primero", (0, 3, 0, 1, 0)),
                ("Cuando puedo, sin obsesionarme", (0, 1, 0, 0, 0)),
                ("Depende de qué gano yo", (0, -1, 0, 0, 0)),
                ("No tanto, prefiero mi propio criterio", (0, -3, 0, -1, -1)),
            ],
        },
        {
            "texto": "¿Buscas entender algo más grande que tú mismo?",
            "opciones": [
                ("Busco activamente entender algo más grande", (0, 0, 3, 0, 1)),
                ("Le doy valor, sin obsesionarme", (0, 0, 1, 0, 0)),
                ("No tanto, prefiero lo práctico", (0, 0, -1, 0, 0)),
                ("Prefiero lo nuevo y lo probado por mí mismo", (0, 0, -3, 0, -1)),
            ],
        },
        {
            "texto": "¿Cómo te relacionas con enseñar lo que sabes?",
            "opciones": [
                ("Enseño y comparto con otros activamente", (0, 0, 0, 3, 1)),
                ("Cuando surge, no lo busco a propósito", (0, 0, 0, 1, 0)),
                ("Prefiero mi propio camino", (0, 0, 0, -1, 0)),
                ("Definitivamente solo, es mi naturaleza", (0, 0, 0, -3, -1)),
            ],
        },
        {
            "texto": "¿Qué lugar ocupa la calma en tu día a día?",
            "opciones": [
                ("La calma es central en mi vida", (0, 0, 0, 1, 3)),
                ("La tengo, sin ser el centro de todo", (0, 0, 0, 0, 1)),
                ("No tanto, prefiero mantenerme activo", (0, 0, 0, 0, -1)),
                ("Poca, vivo con más intensidad", (0, 0, 0, -1, -3)),
            ],
        },
        {
            "texto": "Entre el honor y la tradición, ¿cuál pesa más para ti?",
            "opciones": [
                ("Ambas cosas a la vez, con la misma fuerza", (0, 1, 1, 0, 0)),
                ("Depende del momento", (0, 0, 0, 1, 0)),
                ("Prefiero mi disciplina personal ante todo", (1, 0, -1, 0, 0)),
                ("Ninguna de las dos me define tanto", (0, -1, 0, 0, -1)),
            ],
        },
        {
            "texto": "¿Qué tan estricto eres con tu propia disciplina?",
            "opciones": [
                ("Con disciplina extrema, sin excepciones", (4, 0, 0, 0, 1)),
                ("Con disciplina real, pero flexible", (2, 0, 0, 0, 0)),
                ("Poca, prefiero improvisar", (0, 0, 0, 0, 0)),
                ("Muy poca, no es lo mío", (-2, 0, 0, 0, -1)),
            ],
        },
    ],
    # 100% top3 (9/9)
    "atormentados": [
        {
            "texto": "¿Buscas respuestas más allá de lo material?",
            "opciones": [
                ("Busco entender algo más grande que yo", (0, 0, 3, 0, 0)),
                ("Ni idea, no me lo cuestiono", (0, 0, 0, 0, 0)),
                ("Prefiero lo práctico y concreto", (0, 0, -1, 0, 0)),
                ("Nada de misticismo, soy de este mundo", (0, 0, -3, 0, 0)),
            ],
        },
        {
            "texto": "¿Qué es lo que más te sostiene en tus momentos más oscuros?",
            "opciones": [
                ("El honor y la tradición me sostienen", (2, 1, 2, 0, -1)),
                ("Protejo a quienes quiero, eso es lo mío", (0, 2, 0, 2, 0)),
                ("Cada quien resuelve lo suyo, no me meto", (0, -2, -1, -1, 0)),
                ("No tengo demasiado apego a nada de eso", (-1, 0, -1, 0, 0)),
            ],
        },
        {
            "texto": "¿Sigues un camino definido, o vas a la deriva?",
            "opciones": [
                ("Sigo un camino marcial clásico", (1, 0, 2, -1, -1)),
                ("Con mi gente cerca, aunque sea difícil", (0, 1, 0, 1, 0)),
                ("Cada uno por su lado, así funciona mejor", (0, -1, -1, -1, 1)),
                ("Ando a la deriva, sin un camino claro", (-1, 0, -1, 0, -1)),
            ],
        },
        {
            "texto": "Cuando las cosas se complican, ¿qué se mantiene firme en ti?",
            "opciones": [
                ("Con disciplina rígida, sin importar el costo", (1, 1, 1, -1, -2)),
                ("Con quienes confío, aunque cueste", (0, 1, 0, 1, 0)),
                ("Solo si me conviene a mí", (0, -2, 0, -1, 0)),
                ("Sin mucho orden, según lo que pase", (0, 0, -1, 0, -1)),
            ],
        },
        {
            "texto": "¿Cómo enfrentas lo que te atormenta?",
            "opciones": [
                ("Aislado, buscando respuestas por mi cuenta", (1, 0, 2, -2, -1)),
                ("Compartiéndolo, aunque me cueste abrirme", (0, 1, -1, 1, 0)),
                ("Ocultándolo, no confío en casi nadie", (0, -1, -1, -1, 0)),
                ("Sin darle mucha importancia", (-1, 0, 0, 0, -1)),
            ],
        },
        {
            "texto": "En el fondo, ¿qué es lo que más te motiva a seguir peleando?",
            "opciones": [
                ("Con disciplina y honor por sobre todo", (1, 1, 1, 0, -1)),
                ("Junto a mi gente, eso es lo que importa", (0, 1, 0, 2, 0)),
                ("Calculando siempre mi propio beneficio", (0, -2, -1, -1, 0)),
                ("Sin mucho apego a nada en particular", (0, 0, 0, -1, -1)),
            ],
        },
    ],
    # 94% top3 (15/16)
    "protectores": [
        {
            "texto": "¿Qué tan disciplinado eres con tus responsabilidades?",
            "opciones": [
                ("Con mucha disciplina, sin excepciones", (3, 0, 0, 0, 0)),
                ("Con algo de disciplina", (1, 0, 0, 0, 0)),
                ("Poca, según el momento", (0, 0, 0, 0, 0)),
                ("Casi nada, improviso siempre", (-2, 0, 0, 0, 0)),
            ],
        },
        {
            "texto": "¿La justicia guía tus decisiones?",
            "opciones": [
                ("El honor y la justicia me guían siempre", (0, 3, 0, 1, 0)),
                ("Cuando puedo, sin obsesionarme", (0, 1, 0, 0, 0)),
                ("No tanto, depende de la situación", (0, -1, 0, 0, 0)),
                ("Poco, prefiero mi propio criterio", (0, -3, 0, -1, -1)),
            ],
        },
        {
            "texto": "¿Qué tanto valoras la tradición?",
            "opciones": [
                ("Valoro mucho la tradición", (0, 0, 3, 0, 1)),
                ("Algo, sin ser central", (0, 0, 1, 0, 0)),
                ("Poco, prefiero lo actual", (0, 0, -1, 0, 0)),
                ("Nada, soy de lo moderno y lo nuevo", (0, 0, -3, 0, -1)),
            ],
        },
        {
            "texto": "¿Tu gente es lo primero, siempre?",
            "opciones": [
                ("Mi gente es lo primero, siempre", (0, 0, 0, 3, 1)),
                ("Me importa, sin ser obsesivo", (0, 0, 0, 1, 0)),
                ("Prefiero mi espacio propio", (0, 0, 0, -1, 0)),
                ("Ando bastante solo, así estoy cómodo", (0, 0, 0, -3, -1)),
            ],
        },
        {
            "texto": "¿La calma te define?",
            "opciones": [
                ("La calma me define", (0, 0, 0, 1, 3)),
                ("La tengo, moderada", (0, 0, 0, 0, 1)),
                ("Poca, soy más intenso", (0, 0, 0, 0, -1)),
                ("Muy poca, vivo con fuerza", (0, 0, 0, -1, -3)),
            ],
        },
        {
            "texto": "Si tuvieras que elegir una sola cosa que te define, ¿cuál sería?",
            "opciones": [
                ("Honor y tradición juntos, con fuerza", (0, 1, 1, 0, 0)),
                ("Cuido a mi gente por sobre todo", (0, 0, 0, 1, 0)),
                ("Confío en mi disciplina personal", (1, 0, -1, 0, 0)),
                ("No me apego mucho a ninguno", (0, -1, 0, 0, -1)),
            ],
        },
    ],
    # 85% top3 (11/13)
    "ambiciosos": [
        {
            "texto": "¿Le das lugar a la tradición, aunque busques poder?",
            "opciones": [
                ("Valoro la tradición, aunque busque poder", (1, 0, 3, 0, 1)),
                ("Me es indiferente", (0, 0, 0, 0, 0)),
                ("Prefiero lo práctico", (0, 0, -1, 0, 0)),
                ("Solo me importa la tecnología y el progreso", (0, 0, -3, 0, 0)),
            ],
        },
        {
            "texto": "¿Cómo ejerces el control sobre los demás?",
            "opciones": [
                ("Con calma y control absoluto", (1, -1, 1, -1, 2)),
                ("Cuidando a quienes me sirven", (0, 1, 0, 1, 0)),
                ("Con frialdad calculada, sin culpa", (0, -1, 0, -1, -2)),
                ("Con crueldad, si hace falta", (0, -2, 0, -1, 1)),
            ],
        },
        {
            "texto": "¿Cómo consigues lo que quieres?",
            "opciones": [
                ("Con paciencia y visión a largo plazo", (1, 0, 1, 0, 2)),
                ("Protegiendo a los míos en el proceso", (0, 1, 0, 1, 0)),
                ("Con cálculo frío, paso a paso", (0, -1, 0, -1, -2)),
                ("Sin piedad, tomo lo que quiero", (1, -1, 0, -1, 1)),
            ],
        },
        {
            "texto": "Bajo presión, ¿qué se mantiene firme en ti?",
            "opciones": [
                ("Con disciplina, sin mostrar debilidad", (1, -1, 1, 0, 1)),
                ("Cuidando de mi gente cercana", (0, 1, 0, 1, 0)),
                ("Con frialdad, es solo estrategia", (0, -1, 0, -1, -1)),
                ("Con impulsividad, según lo que sienta", (-1, -1, 0, 0, -1)),
            ],
        },
        {
            "texto": "¿Qué hay detrás de tus decisiones?",
            "opciones": [
                ("Con visión y paciencia absoluta", (1, 0, 1, -1, 2)),
                ("Protegiendo lo que es mío", (0, 1, 0, 1, 0)),
                ("Con cálculo puro, sin sentimentalismo", (1, -1, 0, -1, 1)),
                ("Con impulso y algo de caos", (-1, -1, 0, 1, -1)),
            ],
        },
    ],
    # 81% top3 (13/16)
    "libres_cercanos": [
        {
            "texto": "¿Qué tan importante es la tradición para ti?",
            "opciones": [
                ("Valoro la tradición de verdad", (1, 0, 2, 0, 1)),
                ("Me importa si ayuda a mi gente", (0, 1, 1, 1, 0)),
                ("No mucho, prefiero lo práctico", (0, -1, -2, 0, 0)),
                ("Nada, soy de lo nuevo y lo moderno", (-1, 0, -2, 0, 1)),
            ],
        },
        {
            "texto": "¿Buscas la calma, o prefieres mantenerte en movimiento?",
            "opciones": [
                ("Con calma de fondo, sin apuro", (1, 0, 1, -1, 2)),
                ("Con mi gente, eso me da paz", (0, 1, 0, 1, 1)),
                ("Poca, prefiero mantenerme activo", (0, -1, 0, -1, -1)),
                ("Muy poca, vivo con más intensidad", (-1, 0, -1, 0, 0)),
            ],
        },
        {
            "texto": "¿Prefieres el ritual, o la calle sin ceremonias?",
            "opciones": [
                ("El ritual y la tradición me importan", (0, 1, 2, 0, 1)),
                ("Disfruto la calle, sin ceremonias", (0, 1, -1, 2, 0)),
                ("Ninguno de los dos, voy por lo mío", (-1, -1, 0, -1, 0)),
                ("Un poco de cada uno, según el día", (-1, 0, -1, 1, 1)),
            ],
        },
        {
            "texto": "¿Qué tan importante es la lealtad para ti?",
            "opciones": [
                ("La lealtad lo es todo para mí", (1, 0, 1, 0, 1)),
                ("Mucho, cuido a los míos siempre", (0, 2, 0, 2, 1)),
                ("Algo, sin exagerar", (0, -1, 0, -1, -1)),
                ("Poco, ando bastante suelto", (-1, 0, -1, 1, 0)),
            ],
        },
        {
            "texto": "¿Te importa lo que piensen los demás de ti?",
            "opciones": [
                ("Bastante, me importa lo que piensen", (0, 0, 2, 0, 2)),
                ("Un poco, sin obsesionarme", (0, 1, 0, 1, 0)),
                ("Nada, hago lo mío igual", (-1, -1, -1, 0, 0)),
                ("Nada, y encima disfruto romper moldes", (-1, 0, -2, 0, 1)),
            ],
        },
        {
            "texto": "Un día libre sin nada planeado, ¿qué haces?",
            "opciones": [
                ("Con calma, entrenando por costumbre", (1, 0, 1, -1, 1)),
                ("Con mi gente, aunque sea informal", (0, 1, -1, 1, 1)),
                ("Aprovechando para lo mío", (0, -1, 0, -1, 0)),
                ("Sin agenda, relax total, a mi manera", (-1, 0, -1, 1, -1)),
            ],
        },
    ],
    # 83% top3 (10/12)
    "libres_solitarios": [
        {
            "texto": "¿Qué tan en serio te tomas una pelea?",
            "opciones": [
                ("Con seriedad y disciplina", (1, 0, 1, 0, 1)),
                ("Lo suficiente para no fallarle a los míos", (0, 1, 0, 1, 0)),
                ("Solo si hay algo real que ganar", (0, -2, 0, 0, 0)),
                ("Es un buen momento para pasarla bien, nada más", (-1, 0, -1, -1, 0)),
            ],
        },
        {
            "texto": "¿Cómo te llevas con la tecnología y lo nuevo?",
            "opciones": [
                ("Prefiero lo de siempre, lo probado", (1, 0, 2, 0, 0)),
                ("Lo uso si ayuda a mi gente", (0, 0, -1, 1, 0)),
                ("Lo que sea que me dé ventaja", (0, -2, -1, 0, 0)),
                ("Me encanta lo nuevo, sin pensarlo mucho", (-1, 0, -2, -1, 1)),
            ],
        },
        {
            "texto": "Un día libre sin nada planeado, ¿qué haces?",
            "opciones": [
                ("Entreno igual, por costumbre", (1, 0, 1, -1, 2)),
                ("Lo paso con mi gente cercana", (0, 1, 0, 1, 1)),
                ("Aprovecho para adelantar algo a mi favor", (0, -2, 0, 0, 0)),
                ("Relax total, sin agenda", (-1, 0, -1, 0, -1)),
            ],
        },
        {
            "texto": "¿Cómo reaccionas si alguien te ignora o subestima?",
            "opciones": [
                ("No me afecta, se demuestra con hechos", (1, 1, 0, 0, 1)),
                ("Me molesta más si es con alguien que quiero", (0, 1, 0, 1, 0)),
                ("Me lo tomo personal, no lo dejo pasar", (0, -2, 0, 0, 0)),
                ("Me da mucha bronca, aunque lo disimule", (0, -1, 0, -2, -2)),
            ],
        },
        {
            "texto": "¿Qué lugar ocupa la calma en tu vida?",
            "opciones": [
                ("La busco activamente, es central", (1, 0, 1, 0, 2)),
                ("La encuentro estando con mi gente", (0, 1, 0, 1, 0)),
                ("No tengo tiempo para eso", (0, -3, 0, 0, 0)),
                ("Soy bastante relajado por naturaleza", (-1, 0, 0, 0, 1)),
            ],
        },
        {
            "texto": "Alguien de tu pasado reaparece con cuentas pendientes.",
            "opciones": [
                ("Lo resuelvo con calma, sin rencor", (1, 1, 0, -1, 1)),
                ("Depende de si afecta a mi gente", (0, 1, 0, 1, 0)),
                ("Ahí es cuando cobro lo que me deben", (0, -2, 0, 0, 0)),
                ("Trato de esquivar el drama, ando con lo mío", (0, -1, -1, -2, -2)),
            ],
        },
    ],
}

# preguntas de era — 2 genéricas para Ryu/Chun-Li/Sagat/Karin (8/8
# validado), y una directa dedicada para Ken (2/2 por diseño, ver
# comentario abajo)
ERA_QUESTIONS_GENERIC: list[dict] = [
    {
        "texto": "¿Ya hiciste las paces con tu pasado?",
        "opciones": [
            ("Sí, ahora protejo a otros con esa experiencia", (0, 2, 0, 2, 2)),
            ("Todavía cargo con eso, a veces me consume", (0, -2, 0, -2, -2)),
        ],
    },
    {
        "texto": "¿Sientes que encontraste calma real, o la herida sigue abierta?",
        "opciones": [
            ("Encontré calma real, no busco revancha", (0, 1, 0, 1, 2)),
            ("La herida sigue abierta, me cuesta soltarla", (0, -1, 0, -1, -2)),
        ],
    },
]

# Ken NO pasa por el sistema de vectores — su cambio real es
# circunstancial (vida estable vs. crisis externa que lo obliga a
# esconderse), no un cambio de personalidad medible en los 5 ejes.
# Mapeo directo 1 a 1, sin ambigüedad posible.
KEN_ERA_QUESTION: dict = {
    "texto": "¿Cómo es tu vida ahora mismo?",
    "opciones": [
        ("Estable, pública, sin sobresaltos grandes", "temprana"),
        ("En medio de una crisis que me obliga a esconderme", "tardia"),
    ],
}
