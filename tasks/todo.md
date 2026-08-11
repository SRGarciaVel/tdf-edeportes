# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

CFN tracker real — COMPLETADO Y VERIFICADO contra los 8 perfiles reales.

## Qué se hizo (resumen de todo el camino)

1. Decisión técnica: Python + Playwright, no un microservicio en Go.
2. Primer intento de login automático → bloqueado por CloudFront (403).
3. Se sumó `playwright-stealth` + señales de navegador real → pasó el 403,
   pero se topó con Cloudflare Turnstile en `auth.cid.capcom.com`.
4. **Decisión deliberada: no se automatiza resolver Turnstile.** Se
   pivoteó a reuso de sesión — Seba se loguea manualmente, exporta cookies
   con Cookie-Editor a `backend/cfn_session.json` (gitignored).
5. Con la sesión real cargada, `refresh_cfn.py` corrió contra los 8
   jugadores sin error — encontró personaje principal de cada uno.
6. Con los HTML reales de los 8 perfiles, se ajustaron los selectores de
   extracción con precisión total (antes eran adivinados).

## Verificación real hecha

- [x] Los 8 perfiles reales verificados con `lxml`/`cssselect` contra los
      selectores exactos del código — personaje, MR y LP coinciden 100%
      con lo visible en las capturas de Seba para los 8 jugadores.
- [x] Caso `--- MR` (jugadores sin master rating numérico, ej. Drachen y
      BF) manejado correctamente → `None`, no crashea.
- [x] `npm run build` sin errores con `JugadoresPage.tsx` actualizado para
      mostrar MR/LP en vez de esperar `league_rank` (que nunca llega —
      Capcom lo renderiza como imagen, no texto).
- [ ] **Pendiente:** correr `refresh_cfn.py` (sin `--debug`) una vez más
      con los selectores ya ajustados, confirmar que el endpoint
      `/cfn/players` sirve los datos reales, y que `/jugadores` en el
      navegador se ve bien.

## Siguiente tarea

Deploy real (Supabase + Render/Fly.io) — es lo que Seba dijo que seguía en
cuanto "tuviéramos algo bueno" acá, y ya lo tenemos. **CONFIRMADO por
Seba:** los 8 jugadores devuelven datos reales sin error
(`refresh_cfn.py` corrido en su entorno, 10-08-2026).

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
