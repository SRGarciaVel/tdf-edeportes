# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Deploy a staging (Supabase + Render + Vercel) — COMPLETADO Y EN VIVO.

## Qué se hizo

- Repo publicado en GitHub (`SRGarciaVel/tdf-edeportes`, público).
- Base de datos migrada a Supabase (Session pooler, no Direct connection).
- Backend deployado en Render (`tdf-edeportes-backend.onrender.com`),
  variables de entorno cargadas, health check corregido, endpoint raíz
  agregado.
- Frontend deployado en Vercel (`tdf-edeportes-gamma.vercel.app`), fix de
  `tsc -b` → `tsc --noEmit`, `vercel.json` con rewrite de SPA.
- Twitch OAuth funcionando en producción (Redirect URI agregada en el
  Developer Console, `CORS_ORIGINS`/`TWITCH_REDIRECT_URI` actualizados en
  Render).
- Dos fixes post-deploy encontrados por Seba probando en vivo:
  - Eventos de varios días ahora marcan todo el rango en el calendario
    (`eventDateKeys()`), no solo el día de inicio.
  - Layout del calendario: panel de eventos del día como sidebar sticky a
    la derecha en desktop, en vez de debajo (requería scroll).
- Documentación puesta al día en `SPECS.md §14` (topología completa de
  deploy) y `tasks/lessons.md` (5 lecciones nuevas del proceso).

## Verificación real hecha

- [x] Login con Twitch funcionando en producción de punta a punta
      (confirmado por Seba con capturas).
- [x] Calendario cargando eventos reales desde el backend en Render contra
      la base de Supabase.
- [x] `/jugadores` sirviendo datos reales del CFN tracker (probado antes
      del deploy, no reconfirmado en producción todavía — el cron de
      refresh no está armado en Render aún).
- [x] Creación/edición de eventos desde producción (capturas de Seba
      muestran el modal funcionando, evento "CEO 2026" creado y guardado).
- [ ] **Pendiente:** cron de `refresh_cfn.py` en Render (bloqueado por el
      límite de "one-off jobs" no soportados en el plan Free — ver
      `SPECS.md §14`, necesita decisión: pagar esa pieza puntual, o buscar
      alternativa tipo GitHub Actions).
- [ ] **Pendiente:** que alguien del staff real (no Seba) pruebe el login
      y el dashboard en producción — el bullet del roadmap pide "al menos
      2 miembros del staff real".

## Siguiente tarea

A definir con Seba.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
