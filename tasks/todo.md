# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Modelos SQLAlchemy + primera migración Alembic — COMPLETADA.

## Qué se hizo

- `app/models/user.py`, `role.py` (+ tabla asociativa `user_roles`), `event.py`,
  `event_comment.py`, `quarterly_goal.py`, tal cual el esquema de `SPECS.md §5`.
- `app/models/__init__.py` centraliza los imports para que `Base.metadata`
  los conozca (necesario para que Alembic autogenere bien).
- `alembic/env.py` ahora importa `app.models` explícitamente.
- Migración `c7fff241f52a_modelo_inicial...py` generada por autogenerate.

## Verificación real hecha

- [x] Los 5 modelos importan sin errores (`python -c "from app.models import ..."`).
- [x] Postgres 16 local (fuera de Docker, por restricciones de red del entorno
      donde armé esto) + `alembic revision --autogenerate` → detectó las 6
      tablas correctamente, ninguna de más ni de menos.
- [x] `alembic upgrade head` aplicado de verdad → se verificó con `\dt` que las
      7 tablas existen (6 + `alembic_version`).
- [x] `\d events` y `\d user_roles` confirmaron columnas, tipos, PKs y FKs
      exactamente como en `SPECS.md`.
- [x] `alembic downgrade base` → limpia todo sin dejar residuos, y
      `alembic upgrade head` vuelve a aplicar sin error. Migración reversible confirmada.
- [ ] **Pendiente de correr en tu WSL2:** lo mismo pero contra el Postgres del
      `docker-compose.yml` real (`docker compose exec backend alembic upgrade head`).

## Corrección hecha en el camino

`alembic.ini` seguía apuntando a `script_location = alembic_init_tmp` — un
resabio de cuando renombré esa carpeta durante el bootstrap y no actualicé el
`.ini`. Sin este fix, `alembic revision --autogenerate` fallaba con
"Path doesn't exist". Corregido a `script_location = alembic`.

## Siguiente tarea

Endpoints REST del CRUD de eventos + esquemas Pydantic (`app/schemas/`,
`app/api/events.py`), antes de meterse con Twitch OAuth.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
