# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Seed inicial de staff — COMPLETADA (lógica verificada con Twitch mockeado,
falta que Seba la corra de verdad contra la API real).

## Qué se hizo

- `app/services/twitch.py`: sumado `get_app_access_token` (client
  credentials grant, sin login de usuario) y `fetch_users_by_login` (resuelve
  hasta 100 usernames a sus IDs reales de Twitch en un solo request).
- `backend/scripts/seed_staff.py`: script standalone, idempotente. Mapeo
  username de Twitch → rol:
  - BazthyFreeman → CEO
  - chubisxd → Artista
  - Sirxtias1 → Caster y Programación
  - l_DracheN_l → Contenido Multimedia
  - zacenfg → Gestión de Recursos y TO
  Crea el catálogo de 6 roles (los 5 de arriba + "Colaborador Externo" para
  YH/Pochoclo23 cuando se sumen), precarga cada usuario con `is_staff=True`
  usando su `twitch_id` real (no el username) como llave — así cuando la
  persona haga login por primera vez, el upsert de `/auth/twitch/callback`
  la reconoce por ese mismo `twitch_id` y no le pisa `is_staff`.

## Por qué "mockeado" y no contra la Twitch API real

El sandbox donde armo esto no tiene salida de red hacia `api.twitch.tv` (solo
a pypi/npm/github, por restricciones del entorno). Lo que sí verifiqué con
mocks que devuelven la forma exacta de la respuesta real de Twitch:

- [x] Primera corrida: crea los 4 usuarios simulados con su rol correcto,
      avisa del que falta (simulé que "zacenfg" no aparecía en Twitch, a
      propósito, para probar ese camino).
- [x] Segunda corrida: idempotente — no duplica usuarios, no duplica roles,
      detecta que ya son staff y no hace nada de más.
- [x] Confirmado en la DB real: 6 roles en el catálogo, cada usuario con
      `is_staff=true` y su fila en `user_roles` apuntando al rol correcto.

## PENDIENTE — requiere que Seba lo corra en su entorno real

```
docker compose exec backend python scripts/seed_staff.py
```

Va a pegarle a la Twitch API real con tu `client_id`/`client_secret` ya
cargados. Si algún username está mal escrito o esa persona nunca creó cuenta
de Twitch con ese nombre exacto, el script lo va a avisar sin frenar a los
demás.

## Siguiente tarea

A definir con Seba — quedan pendientes de Fase 1: placeholder de branding
(pausado a pedido de Seba), deploy inicial (Supabase + Render/Fly.io a
definir), y el webhook de Discord (pausado a pedido de Seba).

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
