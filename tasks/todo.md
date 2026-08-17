# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits, en `ROADMAP.md`, y el detalle técnico
> en `SPECS.md` — no acá.

## Tarea actual

Ninguna en curso — la última tanda de trabajo (branding real, tier list
completa con sus dos rediseños, fix del panel de chat) quedó cerrada y
entregada. Sesión pausada porque Claude dejó de poder recibir imágenes en
el chat; continúa en una conversación nueva (ver prompt de traspaso que
Seba tiene guardado).

## Qué se hizo en la última sesión (16-08-2026, sesión larga)

En orden:
1. Skeletons de carga en todo el sitio (reemplazo de "Próximamente" y
   mensajes de "sin datos" que en realidad eran solo carga en curso).
2. `/jugadores`: grilla única mezclada (TDF + escena chilena juntos,
   ordenados por LP) en vez de dos secciones separadas.
3. Fix de badges recortados por el `clip-path` de `.hud-frame`
   (`lessons.md`), sacar jerga técnica del texto visible ("KPI"→
   "indicadores", "cards"→"tarjetas"), colores por personaje SF6 (31) +
   Third Strike (20) en `characterColors.ts`.
4. Sacar a Craime y Blaz de `/jugadores` (pendiente consultarles permiso
   personal) — CFN IDs documentados en `SPECS.md §12` por si vuelven.
5. Branding real recibido del diseñador — logo completo + wordmark +
   favicon, `/nosotros` reescrito con el "About" real de Twitch, Discord
   corregido, Instagram/X agregados. Ver `SPECS.md §15`.
6. Hero del Home reordenado (logo + texto lado a lado).
7. Navbar con más espacio (contenedor más ancho + gap mínimo).
8. Vercel Web Analytics habilitado.
9. **Tier list** — la pieza más grande, con tres rediseños en el mismo
   día. Estado final: plantillas 100% subidas por la comunidad (sin
   roster propio de SF6/Third Strike), crear plantilla requiere login,
   ranquear es libre, tiers editables, drag and drop con reordenamiento
   real, exportar imagen (PNG + portapapeles), guardar y compartir por
   link. Historial completo de decisiones y bugs en `SPECS.md §16-18`.
10. Fix del panel de chat de Twitch (dos causas distintas de "obscured by
    another element" — `transform` de framer-motion, y el botón propio
    tapando el iframe). `SPECS.md §18`, detalle en `lessons.md`.

## Verificación real hecha en la última sesión

Cada pieza de backend nueva (tier lists, plantillas) se probó con
baterías de curl contra Postgres real (no mocks) antes de entregarse —
casos de éxito, 400, 401, 404 por separado. La lógica de reordenamiento
del drag and drop se probó con un script TS aparte (4 escenarios,
incluido el bug reportado exacto). Ver commits y `SPECS.md` para el
detalle de cada batería.

## Pendiente para la próxima sesión (nada urgente, a definir con Seba)

- Confirmar en el navbar que "Tier List" no volvió a apretar el espacio
  (se agregó después del último fix de espaciado).
- Decidir cuál de las dos variantes del logo completo
  (`logo-full.webp` vs `logo-full-alt.webp`) es la oficial.
- Sigue en pausa esperando al CEO: Discord webhook, sistema de puntos
  real, manual de marca oficial completo.
- Craime y Blaz: reponer en `/jugadores` cuando confirmen que quieren
  aparecer.

## Checklist de verificación antes de marcar una tarea como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Migraciones probadas contra Postgres real (upgrade y downgrade)
- [ ] Endpoints probados con curl contra datos reales, no solo que no
      tiren 500
- [ ] `npm run build` sin errores
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`, detalle técnico en
      `SPECS.md` si es una decisión de diseño no obvia
