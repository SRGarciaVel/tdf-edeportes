# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Cron del CFN tracker en producción (GitHub Actions) — CONFIRMADO
FUNCIONANDO EN VIVO.

## Qué se hizo

- `.github/workflows/refresh-cfn.yml`: corre `scripts/refresh_cfn.py`
  cada hora vía GitHub Actions (Render Free no soporta cron jobs).
  Reconstruye `cfn_session.json` desde el secret `CFN_SESSION_JSON`,
  usa el secret `DATABASE_URL` (Session pooler de Supabase).
- YAML validado (y corregida la trampa clásica de `on:` interpretándose
  como booleano en vez de string — se puso entre comillas).
- `SPECS.md §14` actualizado con la decisión.
- **Bug real encontrado y corregido por Seba**: el secret `DATABASE_URL`
  en GitHub tenía la URL de Postgres local (`db`, el nombre del servicio
  en `docker-compose.yml`), no la de Supabase — corregido a mano en el
  dashboard de GitHub (no requirió cambio de código, era un dato mal
  cargado).

## Verificación real hecha

- [x] Sintaxis YAML válida (`yaml.safe_load` sin errores, `on` confirmado
      como string, no booleano).
- [x] **Corrida real en GitHub Actions, exitosa** (`workflow_dispatch`
      manual): los 8 pasos con éxito, "Refrescar stats" completó en 49s.
- [x] Confirmado el error real de un secret mal cargado (host `db` en vez
      del de Supabase) — quedó como caso de aprendizaje, no bug de código.

## Siguiente tarea

A definir con Seba. Pendiente de Fase 1 que sigue abierto: el bullet de
Discord (webhook, en pausa), branding real (en pausa). El sistema de
puntos real queda esperando las respuestas del CEO al documento
`TDF_Sistema_de_Puntos_Preguntas.docx`.

## PENDIENTE de Fase 1 (actualizado)

- [ ] **Pendiente:** cron de `refresh_cfn.py` en Render (bloqueado por el
      límite de "one-off jobs" no soportados en el plan Free — ver
      `SPECS.md §14`, necesita decisión: pagar esa pieza puntual, o buscar
      alternativa tipo GitHub Actions).
- [x] **Confirmado por Seba:** el login y el dashboard fueron probados en
      producción y funcionan.

## Siguiente tarea

A definir con Seba.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
