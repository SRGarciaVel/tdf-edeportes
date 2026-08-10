# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Molde completo del sitio público (Fase 1.5) — COMPLETADA.

## Qué se hizo

- Dirección visual "Tactical Telemetry" (skill `industrial-brutalist-ui`,
  ver `SPECS.md §11`): oscuro, tipografía Rajdhani (headings) + JetBrains
  Mono (metadata/datos), acentos morado/magenta del club — sin mezclar con
  el otro arquetipo del skill (Swiss Industrial Print).
- `tailwind.config.js`: paleta ampliada (`tdf.charcoal`, `tdf.line`),
  `fontFamily.display`/`fontFamily.mono`.
- `src/index.css`: clases utilitarias `.hud-label` y `.hud-frame` (marco con
  esquinas tipo panel táctico), reutilizadas en toda la web.
- `src/components/Navbar.tsx`, `Footer.tsx`, `Layout.tsx`, `SectionLabel.tsx`:
  layout compartido — antes cada página armaba su propio header suelto.
- 6 páginas públicas nuevas/reorganizadas:
  - `HomePage`: landing con foco en comunidad (no en torneos), próximo
    evento destacado con datos reales.
  - `CalendarioPage`: el calendario público, ahora en su propia ruta.
  - `TorneosPage`: **datos reales**, no placeholder — filtra eventos
    `type=torneo` de la API y linkea a su `external_url` (start.gg).
  - `JugadoresPage`: placeholder con los 8 nombres/CFN IDs reales que pasó
    Seba (4 TDF + 4 escena chilena), stats "Próximamente".
  - `ObjetivosPage`: los objetivos trimestrales, en su propia ruta con
    selector de año.
  - `NosotrosPage`: misión del club ("comunidad primero") + staff real.
- `App.tsx` reescrito con las 8 rutas totales (6 públicas + callback + dashboard).

## Decisión de arquitectura documentada (no implementada todavía)

CFN tracker (`SPECS.md §12`): Python + Playwright, no un microservicio en
Go, para que Seba pueda mantener esa pieza sin depender de un lenguaje que
no usa en el resto del proyecto. Queda como tarea propia, no bloqueante.

## Verificación real hecha

- [x] `npm run build` (`tsc -b && vite build`) sin errores con las 6 páginas
      nuevas + componentes de layout.
- [x] `vite preview` sirviendo el build real: `GET /`, `GET /calendario`,
      `GET /jugadores` devuelven 200 (fallback SPA funcionando para rutas
      que no son archivos reales).
- [ ] **Pendiente de confirmar por Seba:** revisión visual en el navegador —
      no tengo browser headless disponible en este sandbox (Playwright
      necesita descargar binarios de una CDN fuera de los dominios
      permitidos acá), así que el build limpio es la verificación más fuerte
      que puedo dar. Ojo particularmente a: que las fuentes de Google Fonts
      carguen bien, que el menú mobile (hamburguesa) funcione, y que el link
      de Discord en el footer sea el correcto (lo reconstruí de un texto con
      salto de línea en una captura vieja — confirmar que sea
      `discord.gg/t6gkWX6j6M` de verdad).

## Siguiente tarea

A definir con Seba.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
