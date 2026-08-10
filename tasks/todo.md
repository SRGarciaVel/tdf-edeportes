# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Login con Twitch en el frontend — COMPLETADA (build verificado, falta que
Seba confirme el click-through real en el navegador).

## Qué se hizo

- `src/lib/types.ts`: tipo `User` compartido (evita import circular entre
  `api.ts` y `auth.tsx`).
- `src/lib/api.ts`: `getTwitchLoginUrl`, `exchangeTwitchCode`, `fetchMe`, `logout`.
- `src/lib/auth.tsx`: `AuthProvider` + `useAuth()` — token en `localStorage`,
  revalida contra `/auth/me` al cargar, descarta el token si quedó inválido.
- `src/components/LoginButton.tsx`: botón "Entrar con Twitch" / info de
  usuario logueado + badge "Staff" si corresponde + botón "Salir".
- `src/pages/AuthCallbackPage.tsx`: recibe `code`/`state` de la URL, llama al
  backend, guarda la sesión, redirige a `/`. Con guard contra el doble-mount
  de React StrictMode en dev (si no, el segundo intento reusa un `code` ya
  gastado y Twitch lo rechaza).
- `src/App.tsx`: ahora con `react-router-dom` (`/` y `/auth/callback`),
  envuelto en `AuthProvider`.

## Verificación real hecha

- [x] `npm run build` (`tsc -b && vite build`) sin errores.
- [x] `vite` dev server levanta y sirve `index.html` correctamente.
- [ ] **Pendiente de confirmar por Seba:** click real en "Entrar con Twitch"
      desde `http://localhost:5173`, login completo, sesión persistida.

## Siguiente tarea

Vista de calendario del staff (listar/crear/editar eventos usando el token
de sesión ya armado) — el próximo bullet grande de Fase 1 en `ROADMAP.md`.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
