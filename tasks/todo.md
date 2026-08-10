# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Flujo completo de Twitch OAuth — COMPLETADA (backend). Falta la prueba
interactiva real en el navegador de Seba (ver más abajo).

## Qué se hizo

- `app/services/twitch.py`: `build_authorize_url`, `exchange_code_for_token`,
  `fetch_twitch_user` — habla con `id.twitch.tv` y `api.twitch.tv/helix`.
- `app/core/security.py`: sumado `create_oauth_state` / `verify_oauth_state`
  (JWT autocontenido de 10 min, protección anti-CSRF sin sesión server-side).
- `app/schemas/auth.py`: `TwitchLoginResponse`, `TwitchCallbackRequest`, `TokenResponse`.
- `app/api/auth.py`: `GET /auth/twitch/login`, `POST /auth/twitch/callback`,
  `GET /auth/me`, `POST /auth/logout`.
- `app/api/deps.py`: sumado `require_authenticated` (login sin requerir staff).
- `SPECS.md §7` actualizado con el endpoint de login que no estaba en el borrador.

## Verificación real hecha (con Twitch mockeado — ver por qué abajo)

- [x] Las 4 rutas de auth quedan registradas en la app.
- [x] `GET /auth/twitch/login` arma la `authorize_url` con `client_id`,
      `redirect_uri` y `scope` correctos, y un `state` nuevo cada vez.
- [x] `state` inválido/falsificado → 400 en el callback (anti-CSRF funcionando).
- [x] Callback con datos de Twitch simulados → crea usuario nuevo con
      `is_staff=False` (nunca se auto-otorga staff, SPECS.md §6).
- [x] `/auth/me` con el token recién emitido → devuelve el usuario correcto.
- [x] Un staff promovió a mano `is_staff=True` en la DB → un segundo login
      del mismo usuario **no lo pisa** (el callback solo actualiza datos de
      perfil, nunca `is_staff`). Este era el caso que más me importaba probar.
- [x] `/auth/me` sin token → 401.
- [x] `/auth/logout` → 204.

## Por qué "Twitch mockeado" y no 100% real

No puedo completar un login interactivo real de Twitch desde este entorno
(requiere abrir un navegador, loguearse con una cuenta real de Twitch, y que
Twitch redirija con un `code` de un solo uso que expira en minutos — eso
solo lo puede hacer una persona). Lo que sí verifiqué es todo lo que no
depende de esa interacción humana: construcción de URLs, seguridad del
`state`, y —lo más importante— la lógica de upsert de usuario con datos de
Twitch simulados pero con la forma real de la respuesta de la Helix API.

## PENDIENTE — requiere que Seba lo haga en su navegador

1. Levantar `docker compose up`, abrir `http://localhost:8000/docs`.
2. Probar `GET /auth/twitch/login`, copiar `authorize_url`, abrirla en el navegador.
3. Loguearse con Twitch de verdad, autorizar la app.
4. Twitch redirige a `http://localhost:5173/auth/callback?code=...&state=...`
   (**esto va a dar 404 todavía** — el frontend no tiene esa ruta armada,
   es la próxima tarea). Copiar el `code` y el `state` de la URL a mano.
5. Con esos dos valores, probar `POST /auth/twitch/callback` desde `/docs` o `curl`.
6. Confirmar que devuelve un `access_token` y que `GET /auth/me` con ese
   token funciona.

## Siguiente tarea

Pantalla de login en el frontend: botón "Entrar con Twitch" que pide
`/auth/twitch/login`, redirige, y una ruta `/auth/callback` que reciba
`code`/`state`, llame a `POST /auth/twitch/callback`, y guarde el token
(en memoria/React state por ahora — decidir si se persiste en algo más
durable se deja para cuando haya sesión real que mantener entre refrescos).

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
