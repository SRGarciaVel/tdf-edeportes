# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Vista de calendario del staff (`/dashboard`) — COMPLETADA.

## Qué se hizo

- `src/lib/calendar.ts`: utilidades puras (`getMonthGrid`, `dateKey`) sin
  dependencias externas — no se agregó date-fns ni similar, el cálculo de
  grilla mensual es simple y no lo justifica.
- `src/lib/types.ts`: `EventItem`, `EventFormValues`, `EventType`, `EventVisibility`.
- `src/lib/api.ts`: sumado `listEvents`, `createEvent`, `updateEvent`, `deleteEvent`.
- `src/components/MonthCalendar.tsx`: grilla de 6x7, puntos de color por
  tipo de evento, día actual resaltado, click para seleccionar.
- `src/components/EventFormModal.tsx`: crear/editar, con botón "Borrar" solo
  en modo edición.
- `src/components/ProtectedRoute.tsx`: redirige a `/` si no hay staff logueado.
- `src/pages/DashboardPage.tsx`: junta todo — calendario + lista del día
  seleccionado + modal.
- `src/App.tsx`: ruta `/dashboard` protegida, link visible en home solo si
  `user.is_staff`.

## Verificación real hecha

- [x] `getMonthGrid` probado con `vite-node`/`tsx`: 42 celdas, arranca en
      domingo, 1° de agosto 2026 cae sábado (confirmado independientemente
      con `date -d`), relleno de días del mes anterior correcto.
- [x] `npm run build` (`tsc -b && vite build`) sin errores con las 4 páginas/
      componentes nuevos.
- [x] Cliente API real (`createEvent`, `listEvents`, `updateEvent`,
      `deleteEvent` de `src/lib/api.ts`, no una reimplementación) ejecutado
      con `vite-node` contra un backend real: crear → aparece en el listado
      → PATCH parcial no pisa otros campos → borrar → ya no aparece →
      listado público sin token da 0 (correcto, era el único evento y lo
      borramos).
- [ ] **Pendiente de confirmar por Seba:** click-through real en el navegador
      — abrir/cerrar el modal, seleccionar días, ver que los puntos de color
      se vean bien, que el `datetime-local` interprete bien la zona horaria
      de Chile.

## Siguiente tarea

Vista pública de solo lectura (calendario + objetivos trimestrales, sin
login) — el siguiente bullet de Fase 1 en `ROADMAP.md`.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
