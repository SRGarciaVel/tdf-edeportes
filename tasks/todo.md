# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Cron del CFN tracker en producción (GitHub Actions) — implementado, sin
probar en vivo todavía.

## Qué se hizo

- `.github/workflows/refresh-cfn.yml`: corre `scripts/refresh_cfn.py`
  cada hora vía GitHub Actions (Render Free no soporta cron jobs).
  Reconstruye `cfn_session.json` desde el secret `CFN_SESSION_JSON`,
  usa el secret `DATABASE_URL` (Session pooler de Supabase).
- YAML validado (y corregida la trampa clásica de `on:` interpretándose
  como booleano en vez de string — se puso entre comillas).
- `SPECS.md §14` actualizado con la decisión.

## Verificación real hecha

- [x] Sintaxis YAML válida (`yaml.safe_load` sin errores, `on` confirmado
      como string, no booleano).
- [ ] **Pendiente:** correr el workflow de verdad — necesita que Seba
      cargue los secrets `CFN_SESSION_JSON` y `DATABASE_URL` en GitHub
      (Settings del repo → Secrets and variables → Actions), y dispare una
      corrida manual (`workflow_dispatch`) para confirmar antes de dejarlo
      en piloto automático cada hora.

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
