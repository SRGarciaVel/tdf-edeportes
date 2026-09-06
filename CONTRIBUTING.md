# Contribuir a TDF e-deportes

Gracias por sumarte al proyecto. Este documento es la guía práctica para
trabajar en el código — no repite lo que ya está en otros archivos, así que
antes de tocar nada, leé en este orden:

1. [`README.md`](./README.md) — qué es el proyecto y cómo correrlo local.
2. [`DOCUMENTACION.md`](./DOCUMENTACION.md) — qué hace cada parte del sitio
   y quién puede hacer qué (útil para entender el contexto antes de cambiar
   una pantalla).
3. [`CODESTYLE.md`](./CODESTYLE.md) — reglas de estilo de código, formato,
   idioma. **Es de lectura obligatoria antes del primer commit.**
4. [`SPECS.md`](./SPECS.md) — decisiones técnicas de cada parte, con el
   "por qué" de cosas que a simple vista podrían parecer raras.

`AGENTS.md` no aplica a este documento — está escrito específicamente para
sesiones de trabajo con IA, no para personas. Los principios generales
(commits frecuentes, no acumular trabajo sin reflejarlo en `ROADMAP.md`,
probar antes de dar algo por terminado) igual valen para cualquiera.

---

## Configurar el entorno local

Seguí la sección "Cómo correrlo (local)" del `README.md`. Resumen rápido:

```bash
git clone <repo-url> tdf-edeportes
cd tdf-edeportes
cp .env.example .env
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000` (Swagger en `/docs`)

Si solo vas a tocar frontend, igual necesitas el backend corriendo local
(`docker compose up`) para que la app tenga contra qué pedir datos — no hay
un modo "solo frontend con datos de prueba" armado todavía.

---

## Flujo de trabajo con Git

Hasta ahora el proyecto se trabajó con commits directos a `main`. Con más de
una persona tocando el mismo código, la recomendación es pasar a un flujo
simple de rama por cambio:

1. Crear una rama descriptiva a partir de `main`:
   `git checkout -b feat/nombre-del-cambio` (o `fix/`, `docs/`, según
   corresponda — mismos prefijos que ya usan los commits, ver más abajo).
2. Commitear en esa rama con la misma convención de siempre.
3. Abrir un Pull Request contra `main` en GitHub, aunque sea un cambio
   chico — sirve como registro de qué se hizo y por qué, y da un lugar
   donde alguien más pueda revisar antes de que se mezcle.
4. Seba revisa y mergea (o pide ajustes).

Si esto no te calza con cómo prefieren trabajar en el equipo, es una
sugerencia de arranque, no una regla grabada en piedra — ajústenla y
actualicen esta sección.

---

## Reglas de código para frontend

Todo lo de `CODESTYLE.md` aplica (nomenclatura en inglés, `strict: true`,
nada de `any` sin justificar en comentario, un archivo con una sola
responsabilidad). Además, específico de este proyecto:

- **Antes de crear un componente nuevo, revisá si ya existe uno reusable.**
  El proyecto tiene bastantes piezas comunes en `frontend/src/components/`:
  `Layout`, `SectionLabel`, `Skeleton`, `InitialsAvatar`, `PlayerCard`, y
  varios editores/embeds específicos. Reusarlos mantiene el sitio
  consistente visualmente sin que cada pantalla reinvente su propio look.
- **No hay carpeta `hooks/` separada** — los hooks propios (`useCachedData`,
  `useTwitchLiveStatus`, etc.) viven directo en `frontend/src/lib/`, junto
  con el cliente de API (`api.ts`) y los tipos (`types.ts`).
- **Librerías ya instaladas, no agregar duplicadas:** `framer-motion` para
  animación, `html-to-image` para exportar cosas como PNG, `react-icons`
  para íconos de marca (Instagram/X/Twitch — `lucide-react` no tiene íconos
  de marca, es solo para íconos genéricos de interfaz).
- **Sistema visual:** paleta oscura con acento magenta/púrpura
  (`bg-tdf-charcoal`, `bg-tdf-dark`, `text-tdf-muted`, `border-tdf-line`,
  `text-tdf-magenta`/`bg-tdf-magenta`), tipografía `font-display` (títulos),
  `font-mono` (etiquetas técnicas tipo HUD, casi siempre en mayúscula), y
  `font-body` (texto de lectura). El patrón `hud-frame` es el panel base
  que se usa en casi todas las pantallas — mira cómo se usa en una página
  existente antes de armar un panel nuevo desde cero.
- **Antes de pedir review, corré:**
  ```bash
  cd frontend
  npx tsc --noEmit
  npx vite build
  npx prettier --write <archivos que tocaste>
  ```
  Los tres tienen que pasar sin errores. No hay suite de tests
  automatizados en frontend todavía — la verificación hoy es manual
  (levantar la app y probar el flujo a mano).

---

## Idioma y texto visible del sitio — la parte que más se presta a errores

Esta es la sección que más vale la pena leer con cuidado, porque es fácil
de pasar por alto sin querer.

### Tuteo chileno, nunca voseo rioplatense

Todo texto visible del sitio (párrafos, botones, mensajes de error,
placeholders) va en **tuteo con conjugación de "tú"** — nunca voseo
("armá", "podés", "tenés"). El club es chileno, no argentino, y esta regla
no admite excepciones.

| Voseo (❌ no usar) | Tuteo chileno (✅ correcto) |
|---|---|
| armá, arrastrá, agregá | arma, arrastra, agrega |
| podés, tenés, querés | puedes, tienes, quieres |
| sos | eres |
| contá, mirá, tocá, probá | cuéntanos/cuenta, mira, toca, prueba |
| necesitás | necesitas |

Antes de dar por terminado cualquier texto nuevo, releelo buscando
específicamente conjugaciones en "-ás", "-és", "-ís" sin tilde de tú, y la
palabra "vos". Si tienes dudas con una palabra puntual, la forma tuteante
casi siempre termina en "-as", "-es" o "-e" en vez de "-ás"/"-és"/"-í(s)".

### Sin em-dash ("—") en texto visible del sitio

Esta regla es solo para lo que ve la persona usuaria (párrafos, labels,
meta tags) — en comentarios de código un em-dash es puntuación normal, no
hay problema ahí. Para "sin dato" en la interfaz, usar "N/D", no un guión
largo suelto.

---

## Backend: si tocas una migración

Si tu cambio incluye una migración de Alembic nueva, correrla **en los dos
lugares por separado** — nunca asumir que uno cubre al otro:

```bash
docker compose exec backend alembic upgrade head
docker compose run --rm -e DATABASE_URL="<connection string de Supabase>" backend alembic upgrade head
```

Ver `SPECS.md` para la connection string real y el motivo de por qué hace
falta el paso del Session pooler específicamente.

---

## Commits

Conventional commits, en español: `tipo: descripción breve`.

Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`. Formatear
(`prettier`/`ruff format`) **antes** de cada commit, nunca después.

---

## Si agregas o cambias algo de alcance

- Reflejalo en `ROADMAP.md` — no dejar trabajo hecho sin anotar.
- Si corregiste algo por una lección aprendida (un bug raro, una decisión
  que no era la esperada), anotalo en `tasks/lessons.md` para que no se
  repita.

---

## Dudas

Ante cualquier duda de producto o de prioridad (no de sintaxis), la
referencia es Seba (programador principal) — evitá asumir la respuesta
"más razonable" en decisiones de diseño o alcance, mejor preguntar antes de
construir algo grande sobre un supuesto que puede no ser el correcto.
