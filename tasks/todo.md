# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

CRUD de eventos + comentarios + auth JWT propia (sin Twitch OAuth todavía) — COMPLETADA.

## Qué se hizo

- `app/core/security.py`: `create_access_token` / `decode_access_token` (JWT propio).
- `app/api/deps.py`: `get_current_user` (opcional, None si no hay token) y
  `require_staff` (403 si no es staff autenticado) — implementa la regla
  única de `SPECS.md §4`.
- `app/schemas/user.py`, `event.py`, `comment.py` — Pydantic v2, `type` y
  `visibility` como `Literal` (validación en capa de app, no ENUM de Postgres
  — ver nota de diseño en el mensaje anterior).
- `app/services/discord.py`: `notify_event_change`, sin cola de tareas, log si falla.
- `app/api/events.py`: CRUD completo de `/events` + `/events/{id}/comments`,
  filtra por `visibility` cuando no hay staff autenticado.
- Router registrado en `main.py`.

## Verificación real hecha (contra Postgres local, no solo import)

- [x] App importa con las 7 rutas nuevas registradas.
- [x] Usuario staff de prueba + JWT emitido a mano (no es el seed oficial —
      ese usa Twitch IDs reales, pendiente).
- [x] Sin token → `POST /events` da 403.
- [x] Con token staff → crea evento público y evento staff-only, ambos 201.
- [x] Sin token → `GET /events` solo devuelve el evento público.
- [x] Con token staff → `GET /events` devuelve ambos.
- [x] `type` inválido → 422. `end_at` antes de `start_at` → 422 (validator).
- [x] Comentario se crea y el `GET` de comentarios devuelve el `author` anidado.
- [x] Datos de prueba limpiados de la DB después de verificar.

## Siguiente tarea

Flujo completo de Twitch OAuth (`/auth/twitch/callback`, `/auth/me`,
`/auth/logout`) que reemplace la emisión manual de JWT de esta prueba por el
flujo real descrito en `SPECS.md §6`. Requiere que el `TWITCH_CLIENT_ID` /
`TWITCH_CLIENT_SECRET` de la app ya registrada por Seba estén en el `.env`.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
