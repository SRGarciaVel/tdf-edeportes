# CODESTYLE.md — TDF e-deportes

Reglas de estilo para este proyecto. Aplican a todo el código que se
commitee, sin excepción.

## Idioma

- **Nomenclatura de código** (variables, funciones, clases, archivos, rutas
  de API): **inglés estricto**. Es el estándar del ecosistema y evita
  fricción con librerías, linters y documentación externa.
- **Comentarios, docstrings, mensajes de commit y documentación** (`SPECS.md`,
  `README.md`, `ROADMAP.md`, este archivo): **español**.
- **Texto visible del sitio** (párrafos, labels, botones, mensajes de error
  o de "sin datos"): español chileno, tuteo con conjugación de **tú**
  ("arma", "arrastra", "agrega", "puedes"), **nunca** voseo rioplatense
  ("armá", "arrastrá", "agregá", "podés", "querés", "tenés", "sos"). Seba
  es chileno, no argentino — esta regla no admite excepciones y ya se violó
  dos veces sin querer (una vez en el texto nuevo de `/tierlist`, otra al
  reescribir el "About" real de `/nosotros`), ver `SPECS.md §16`. Antes de
  dar por terminado cualquier texto nuevo, revisar que no se haya colado
  ninguna conjugación de voseo.
- **Sin em-dash ("—") en texto visible del sitio**, tampoco en meta tags
  (`og:description`, etc. — también se ven cuando alguien comparte el
  link). Usar punto, coma, o separar en dos oraciones. Para valores de
  "sin dato" en UI, usar "N/D", no un guión largo suelto. Esta regla NO
  aplica a comentarios de código — ahí es puntuación normal. Ver
  `SPECS.md §15-16` para el historial de cuándo se coló y por qué.
- Si esta regla no es la que se quería (por ejemplo, si se prefiere también
  nomenclatura en español), se ajusta este documento explícitamente — no se
  asume a mitad de desarrollo.

## Comentarios

- Comentar **solo** lo que no es obvio desde el código mismo: decisiones de
  arquitectura, trade-offs, "por qué" en vez de "qué".
- Prohibido comentar código evidente (`# incrementa el contador`).
- Nada de comentarios vagos tipo `# fix` o `# TODO` sin contexto — si hay un
  TODO, debe decir qué falta y por qué no se hizo ahora.
- Docstrings solo en funciones/endpoints públicos con lógica no trivial.

## Formato y estructura

- **Backend (Python):** `ruff` para lint + format. Tipado obligatorio con
  type hints en toda función pública; Pydantic para validación de entrada y
  salida en cada endpoint.
- **Frontend (TypeScript/React):** `eslint` + `prettier`. `strict: true` en
  `tsconfig.json`. Nada de `any` sin justificación explícita en comentario.
- Un archivo, una responsabilidad. Si un archivo de rutas supera ~200 líneas,
  se separa por dominio (`events.py`, `auth.py`, no un `routes.py` monolítico).
- Sin lógica de negocio en los routers/controllers — va en `services/`.
  Los routers solo orquestan: reciben request, llaman al service, devuelven
  response.

## Producción

- Nada de credenciales ni secrets hardcodeados — todo vía variables de
  entorno (`.env`, nunca commiteado; `.env.example` sí).
- Nada de `print()`/`console.log()` en código que llega a producción — usar
  logging estructurado (`logging` en Python, un logger consistente en
  frontend si aplica).
- Migraciones de base de datos siempre vía Alembic, nunca `create_all()` en
  producción.
- Manejo explícito de errores en cada integración externa (Twitch, Discord):
  nunca dejar una excepción sin capturar que tumbe el request completo por
  un servicio de terceros caído.

## Commits

- Conventional commits: `tipo: descripción breve en español`.
  Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
  Ejemplo: `feat: agregar login con Twitch OAuth`.
- Un commit por checkpoint significativo del `ROADMAP.md`, no un commit gigante
  al final del día.
- Formatear (`ruff format` / `prettier`) **antes** de cada commit, nunca después.

## Elegancia sobre parches

- Antes de cerrar cualquier tarea no trivial: ¿hay una forma más simple de
  resolver esto con las herramientas que ya están en el stack? Si la
  respuesta es sí, se rehace antes de commitear.
- No se sobre-ingenieriza tampoco: si el problema es simple, la solución es
  simple. Ver `SPECS.md §4` — no se construye una matriz de permisos que
  nadie pidió.
