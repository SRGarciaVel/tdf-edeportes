# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Vista pública de solo lectura + CRUD de `quarterly_goals` — COMPLETADA.

## Qué se hizo

- `app/schemas/goal.py`: `GoalCreate`, `GoalUpdate`, `GoalRead`. `quarter`
  validado 1-4, `year` 2020-2100 (`Field(ge=..., le=...)`).
- `app/api/goals.py`: CRUD completo. `GET /goals` es 100% público (sin
  `visibility`, a diferencia de eventos — los objetivos del club siempre
  son públicos por diseño). Filtros opcionales `?year=&quarter=`.
- Router registrado en `main.py`.
- `src/lib/types.ts`: `QuarterlyGoal`.
- `src/lib/api.ts`: `listGoals` (solo lectura — ver nota abajo).
- `src/components/QuarterlyGoals.tsx`: objetivos agrupados por trimestre, Q1-Q4.
- `App.tsx` reescrito: el home (`/`) ahora es la vista pública real —
  `MonthCalendar` reutilizado en modo solo-lectura (sin botón de crear, sin
  click-to-edit) con los eventos públicos, más la sección de objetivos
  trimestrales debajo.

## Alcance que quedó afuera a propósito

Solo implementé `listGoals` en el frontend (lectura). NO hay UI para que el
staff cree/edite/borre objetivos desde el dashboard — el backend ya lo
soporta completo (`createGoal`/`updateGoal`/`deleteGoal` no existen todavía
del lado del cliente). Lo dejé así porque el bullet de `ROADMAP.md` pedía
"vista pública" primero; una UI de gestión de objetivos es la extensión
natural pero no bloqueaba esta tarea. Si se necesita pronto, es agregar 3
funciones a `api.ts` + un formulario simple, reusando el patrón de
`EventFormModal.tsx`.

## Verificación real hecha

- [x] Backend: 7 casos con `TestClient` — crear sin token (403), crear con
      staff (201), `quarter` inválido (422), listar sin token (público,
      200), filtros `year`/`quarter` correctos, `PATCH` parcial no pisa el
      resto de los campos, `DELETE` funciona y desaparece del listado.
- [x] `npm run build` sin errores con la vista pública nueva.
- [x] Cliente real (`listEvents(null)`, `listGoals`) probado con `vite-node`
      contra el backend: un evento público creado aparece en
      `listEvents(null)` tal cual lo vería un visitante sin login.
- [ ] **Pendiente de confirmar por Seba:** que la vista pública en el
      navegador se vea bien, sobre todo la sección de objetivos vacía (no
      hay ningún objetivo cargado todavía en la base real).

## Siguiente tarea

Webhook saliente a Discord al crear/modificar evento — es el último bullet
grande de Fase 1 en `ROADMAP.md` antes del deploy inicial. El servicio
(`app/services/discord.py`) ya existe desde la tarea de CRUD de eventos,
pero nunca se probó con una URL de webhook real — falta que Seba cree un
webhook en el Discord del club y lo pase para probarlo de punta a punta.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
