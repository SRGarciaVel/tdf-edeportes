# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Endpoint de agregación + UI del historial de partidas — COMPLETADO.

## Qué se hizo

- `app/schemas/cfn.py`: `CFNMatchStats` (total, wins, losses, win_rate,
  personajes usados en la ventana).
- `app/api/cfn.py`: `GET /cfn/players/{cfn_id}/matches?days=N` (público,
  `days` validado entre 1 y 30). Agrega en el backend, no manda partidas
  individuales al frontend.
- `frontend/src/lib/api.ts`: `getMatchStats`.
- `frontend/src/pages/JugadoresPage.tsx`: selector 1D/3D/7D (default 7),
  fetch de stats para los 8 jugadores en paralelo, línea de W-L/win
  rate/personajes agregada a cada card.

## Verificación real hecha

- [x] Endpoint probado contra Postgres real con datos sembrados en 3
      ventanas de tiempo distintas (dentro de 1 día, dentro de 3 pero no de
      1, fuera de 7) — conteos y win_rate exactos en cada ventana.
- [x] Caso sin partidas → `total_matches: 0`, `win_rate: null` (no "0%",
      que sería engañoso).
- [x] Validación de `days` fuera de rango (probado con 999) → 422.
- [x] Cliente TS real (`getMatchStats`, no una reimplementación) probado
      con `vite-node` contra el backend real — mismos resultados.
- [x] `npm run build` sin errores con la UI nueva.

## Siguiente tarea

A definir con Seba. Con esto, el pedido original ("win rate por día, otros
personajes usados, filtro de 1-3 días") queda resuelto de punta a punta.
Sigue en pausa: Discord webhook, branding real, sistema de puntos
(esperando al CEO).

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
