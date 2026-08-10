# SPECS.md — TDF e-deportes: Plataforma Web de Organización

## 1. Contexto

TDF e-deportes es un club de esports enfocado en juegos de pelea (Street Fighter 6,
Third Strike, Alpha 2, entre otros) que transmite en Twitch (`tdfedeportes`). Este
documento define el alcance técnico de la **Fase 1**: un dashboard interno de
organización para el staff del club.

Fases posteriores (calendario/brackets públicos, widget de interacción en vivo,
rewards, overlay dinámico, integración profunda con Discord) están fuera del
alcance de este documento y se especifican en documentos separados cuando
corresponda. Ver `ROADMAP.md` para el orden acordado con el CEO.

## 2. Objetivo de Fase 1

Un solo lugar donde todo el staff (CEO, manager, moderadores, casters, staff
técnico, colaboradores externos autorizados) puede ver y gestionar el itinerario
del club — torneos, streams y reuniones — con una vista pública de solo lectura
para calendario y objetivos trimestrales.

## 3. Alcance

### Incluido
- Autenticación vía Twitch OAuth.
- Gestión de usuarios y roles (catálogo de roles, sin jerarquía de permisos).
- CRUD de eventos (torneo, stream, reunión, otro).
- Vista de calendario (staff y pública).
- Comentarios por evento (solo staff).
- Vista pública de solo lectura: calendario + objetivos trimestrales (Q1-Q4).
- Webhook saliente a Discord al crear/modificar un evento.

### Explícitamente fuera de alcance (Fase 1)
- Sistema de puntos/rewards.
- Widget de interacción en tiempo real durante el stream.
- Overlay dinámico conectado a la plataforma.
- Integración con la API de start.gg (por ahora solo se guarda el link externo).
- Sincronización de roles con Discord (solo notificación saliente vía webhook).

## 4. Modelo de negocio de permisos

**No es RBAC estricto.** Los roles son metadata organizativa, no un gate de
autorización. Regla única: `¿está autenticado y pertenece al staff?` → puede
crear, editar y comentar eventos. Un usuario `público` (no autenticado, o
autenticado sin rol de staff) solo tiene acceso de lectura a lo marcado como
`visibility = público`.

Si en el futuro el club pide restringir una acción puntual a un rol específico,
se agrega esa regla ahí — no se diseña de antemano una matriz de permisos que
nadie pidió.

## 5. Modelo de datos

```
users
  id                  UUID PK
  twitch_id           TEXT UNIQUE NOT NULL
  twitch_username     TEXT NOT NULL
  display_name        TEXT NOT NULL
  avatar_url          TEXT
  email               TEXT              -- opcional, login alternativo
  is_staff            BOOLEAN DEFAULT FALSE
  created_at          TIMESTAMPTZ DEFAULT now()

roles                                    -- catálogo, no jerarquía
  id                  UUID PK
  name                TEXT UNIQUE NOT NULL
      -- CEO, Artista, Caster/Programación, Contenido Multimedia,
      -- Gestión de Recursos/TO, Colaborador Externo

user_roles                               -- N:M
  user_id             UUID FK -> users.id
  role_id             UUID FK -> roles.id
  PRIMARY KEY (user_id, role_id)

events
  id                  UUID PK
  title               TEXT NOT NULL
  type                TEXT NOT NULL      -- torneo | stream | reunion | otro
  start_at            TIMESTAMPTZ NOT NULL
  end_at              TIMESTAMPTZ
  description         TEXT
  external_url        TEXT               -- link a start.gg si es torneo
  visibility          TEXT NOT NULL DEFAULT 'staff'  -- staff | publico
  created_by          UUID FK -> users.id
  created_at          TIMESTAMPTZ DEFAULT now()
  updated_at          TIMESTAMPTZ DEFAULT now()

event_comments
  id                  UUID PK
  event_id            UUID FK -> events.id
  user_id             UUID FK -> users.id
  body                TEXT NOT NULL
  created_at          TIMESTAMPTZ DEFAULT now()

quarterly_goals
  id                  UUID PK
  quarter             SMALLINT NOT NULL  -- 1-4
  year                SMALLINT NOT NULL
  title               TEXT NOT NULL
  description         TEXT
  status              TEXT DEFAULT 'en_progreso'  -- en_progreso | cumplido | descartado
```

## 6. Autenticación — Twitch OAuth

Flujo Authorization Code:

1. Frontend redirige a `https://id.twitch.tv/oauth2/authorize` con
   `client_id`, `redirect_uri`, `scope=user:read:email`, `response_type=code`.
2. Twitch redirige de vuelta con `code`.
3. Backend intercambia `code` por `access_token` en
   `https://id.twitch.tv/oauth2/token`.
4. Backend consulta `https://api.twitch.tv/helix/users` con ese token para
   obtener `id`, `login`, `display_name`, `profile_image_url`.
5. Backend hace upsert en `users` y emite un JWT propio de sesión (no se
   reenvía el token de Twitch al cliente).
6. `is_staff` se asigna manualmente (seed inicial con los 5 miembros del staff
   + colaboradores externos autorizados) — no hay auto-registro como staff.

Variables de entorno requeridas: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`,
`TWITCH_REDIRECT_URI`, `JWT_SECRET`, `JWT_EXPIRATION_MINUTES`.

## 7. Endpoints REST (borrador)

```
POST   /auth/twitch/callback        -- intercambia code por sesión propia
GET    /auth/me                     -- usuario autenticado actual
POST   /auth/logout

GET    /events                      -- lista (filtra por visibility si no hay auth)
POST   /events                      -- requiere is_staff
GET    /events/{id}
PATCH  /events/{id}                 -- requiere is_staff
DELETE /events/{id}                 -- requiere is_staff

GET    /events/{id}/comments
POST   /events/{id}/comments        -- requiere is_staff

GET    /goals?year=&quarter=         -- público
POST   /goals                       -- requiere is_staff
PATCH  /goals/{id}                  -- requiere is_staff

GET    /roles                       -- catálogo
GET    /users                       -- requiere is_staff (para asignar roles)
```

## 8. Integración Discord (saliente)

Al crear o modificar un evento con `visibility = staff` o `publico`, el backend
dispara un `POST` a un webhook de Discord configurado por variable de entorno
(`DISCORD_WEBHOOK_URL`). Sin cola de tareas (Celery) en esta fase — si falla el
webhook, se loguea el error y no se reintenta; no hay volumen que justifique
más que eso todavía.

## 9. Branding (placeholder)

Assets extraídos de las capturas ya compartidas se usan como placeholder en
`docs/assets/` hasta que el club (Chubi) entregue el manual de marca oficial
(logo en alta resolución, paleta hex). Ver nota en `README.md`.

## 10. Deuda técnica conocida / decisiones pendientes

- Titularidad de la app de Twitch Developer Console: pendiente que el CEO
  decida si la registra con una cuenta institucional o se registra
  temporalmente con la cuenta del desarrollador, con plan de migración.
- Catálogo de roles puede crecer; el modelo ya lo soporta sin cambios de
  esquema (solo insertar filas en `roles`).
