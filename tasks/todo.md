# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Bootstrap del proyecto (primer bullet de Fase 1 en `ROADMAP.md`) — COMPLETADA.

## Qué se hizo

- Backend FastAPI: `app/main.py`, `app/core/config.py` (Settings vía env vars),
  `app/core/database.py` (engine/session SQLAlchemy), `app/api/health.py`.
- Alembic inicializado y conectado a `Base.metadata` / `settings.database_url`.
- `backend/Dockerfile`.
- Frontend Vite + React + TS + Tailwind: scaffold manual (`create-vite` no
  pisa directorios no vacíos, ver nota abajo), `App.tsx` con chequeo de salud
  del backend, paleta Tailwind placeholder (`tdf.purple`, `tdf.magenta`, `tdf.dark`).
- `frontend/Dockerfile`.
- `docker-compose.yml` raíz con `db` (Postgres 16), `backend`, `frontend`.
- `.gitignore`, `.env.example`.

## Verificación real hecha

- [x] Backend: `pip install -r requirements.txt` + `python -c "from app.main import app"` → import ok.
- [x] Backend: `uvicorn` levantado localmente, `curl http://localhost:8000/health` → `{"status":"ok"}`.
- [x] Backend: `alembic/env.py` compila y usa `settings.database_url` (no hardcodeado en `alembic.ini`).
- [x] Frontend: `npm install` sin errores.
- [x] Frontend: `npm run build` (`tsc -b && vite build`) sin errores, genera `dist/`.
- [ ] **Pendiente de verificar por Seba en WSL2:** `docker compose up --build` completo
      (no se pudo probar acá porque el sandbox no tiene acceso a Docker Hub).

## Siguiente tarea

Modelo de datos: modelos SQLAlchemy (`users`, `roles`, `user_roles`, `events`,
`event_comments`, `quarterly_goals`) + primera migración Alembic.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
