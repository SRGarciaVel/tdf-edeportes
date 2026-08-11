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
      -- Gestión de Recursos/TO, Programador, Colaborador Externo

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
DELETE /goals/{id}                  -- requiere is_staff (no estaba en el
                                        borrador original, agregado por
                                        simetría con /events)

GET    /roles                       -- catálogo
GET    /users                       -- requiere is_staff (para asignar roles)
```

Además `GET /auth/twitch/login` (agregado durante la implementación, no
estaba en el borrador original): devuelve `authorize_url` + `state`, para
que el `TWITCH_CLIENT_ID` quede solo en el backend y no en el bundle del
frontend. El `state` es un JWT autocontenido de 10 minutos (sin sesión
server-side) validado en el callback como protección anti-CSRF estándar del
flujo OAuth.

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

## 11. Frontend público — molde de sitio (Fase 1.5)

Dirección visual: **Tactical Telemetry / CRT Terminal** (uno de los dos
arquetipos del skill `industrial-brutalist-ui`) — oscuro, monoespaciado en
metadata, alta densidad de datos. Encaja con la identidad ya existente del
club (overlay morado con llamas) y con el lenguaje visual propio de un juego
de pelea (HUD, barras de vida, contadores). Un solo arquetipo, sin mezclar
con Swiss Industrial Print.

**Capa de acento street/graffiti (agregada tras revisar referencias reales
de la UI de SF6 Type Arcade):** paneles con esquinas cortadas en diagonal
(`clip-path`, no rectángulos planos), líneas divisorias con glow neón,
textura halftone tipo spray detrás de heroes/headers (`spray-bg`), marca
tipo splatter para el día seleccionado del calendario (`spray-mark`), y una
fuente de acento tipo pintura (`Rubik Wet Paint`) usada *solo* en el wordmark
más grande de cada página — nunca en texto de lectura, pierde legibilidad.
Colores: se mantiene la paleta propia de TDF (morado/magenta), no se
importan los colores de SF6 (naranja/rojo) — se toma la forma, no la marca
ajena.

Sitemap público:
- `/` — Home
- `/calendario` — pública, y staff-aware: si estás logueado como staff, la
  misma página muestra los controles de crear/editar/borrar (ver
  `tasks/lessons.md`, se fusionó con lo que iba a ser `/dashboard` — una
  sola página en vez de dos calendarios casi idénticos en paralelo)
- `/torneos` — página propia, foco en brackets/link a start.gg (torneos son
  eventos que organiza el club, no su foco principal — TDF se define primero
  como comunidad de streaming)
- `/jugadores` — CFN de TDF y de la escena chilena (ver §12)
- `/objetivos` — objetivos trimestrales (ya implementado)
- `/nosotros` — quiénes son, incluye al staff organizador

Layout compartido (`Navbar` + `Footer`) envolviendo todas las páginas
públicas — antes cada página armaba su propio header suelto.

## 12. CFN tracker — decisión técnica (implementación pendiente)

Objetivo: mostrar rango/LP/MR/personaje de jugadores conocidos de Street
Fighter 6, tanto de TDF como de la escena chilena en general.

**Jugadores a trackear (CFN ID numérico):**
- TDF: Sirxtias `2844671427`, Drachen `2908057346`, BF `4100957688`,
  AckermanFG `1733837998`
- Escena chilena: Younghou `1027356162`, Pochoclo23 `3987753314`,
  Craime `1009159858`, Blaz `3381453962`

**Por qué no es una integración simple:** Buckler's Boot Camp (la web de
Capcom donde vive esta info) no es pública — hace falta autenticarse con un
Capcom ID que tenga SF6 vinculado antes de poder consultar el perfil de
cualquier jugador. Es scraping de un endpoint no documentado, no una API
oficial. El proyecto de referencia (`williamsjokvist/cfn-tracker`, MIT) lo
resuelve con **Go + Rod** (controla un Chromium headless real, no un cliente
HTTP simple) — el login de Capcom probablemente tiene protecciones que
exigen un navegador real.

**Decisión: reimplementar en Python con Playwright**, no wrappear el
proyecto de Go como microservicio aparte. Se evaluaron ambas opciones — la
razón de fondo para descartar Go: mantener todo el proyecto en un stack que
Seba pueda debuggear y extender solo, sin depender de terceros para tocar
esa pieza el día que Capcom cambie algo en su web (motivo explícito del
proyecto: autonomía de desarrollo).

Costo asumido: imagen de Docker más pesada por el Chromium headless de
Playwright; y como el código fuente de Go no expone el detalle interno del
login (solo firmas de función públicas), la lógica exacta de autenticación
hay que reconstruirla empíricamente (grabando un login real a Buckler's Boot
Camp con el inspector de Playwright) cuando se implemente.

**Actualización tras la primera corrida real:** el intercambio automático
de `CFN_EMAIL`/`CFN_PASSWORD` no llegó a implementarse como login — Capcom
protege `auth.cid.capcom.com` (donde vive el login real) con Cloudflare
Turnstile, un desafío interactivo de verificación humana. **Decisión
deliberada: no se automatiza resolver eso.** No es una limitación técnica,
es un límite que no se cruza — automatizar la evasión de un sistema
anti-bot de un tercero no es algo que este proyecto haga, sin importar lo
inocente del uso final.

**Solución adoptada: reuso de sesión manual.** Seba se loguea una vez como
humano normal en su navegador (resuelve el Turnstile él mismo, como
cualquier persona), exporta las cookies de esa sesión ya autenticada con
una extensión tipo "Cookie-Editor" (Chrome/Firefox), y las guarda en
`backend/cfn_session.json` (gitignored, son credenciales). El scraper carga
esas cookies en el contexto de Playwright en vez de intentar loguearse.

Paso a paso para Seba (repetir cuando la sesión venza):
1. Ir a `https://www.streetfighter.com/6/buckler/en/profile/auth` en un
   navegador normal y loguearse con Capcom ID (resolviendo el Turnstile
   normalmente).
2. Con la extensión Cookie-Editor, exportar las cookies del dominio
   `capcom.com` (incluye subdominios como `auth.cid.capcom.com`) como JSON.
3. Guardar ese JSON como `backend/cfn_session.json`.
4. Correr `docker compose exec backend python scripts/refresh_cfn.py --debug`.

Cuando la sesión venza, `_verify_session` en `app/services/cfn_scraper.py`
lo detecta (Buckler's Boot Camp muestra el botón de login en vez del
perfil) y tira un error explícito pidiendo repetir el export — nunca falla
en silencio sirviendo datos viejos como si fueran actuales.

`playwright-stealth` (v2.x — la v1.0.6 está rota, depende de
`pkg_resources` que las versiones nuevas de `setuptools` ya no traen) se
mantiene igual, para las páginas de perfil públicas que sí están detrás de
CloudFront (ahí no hay Turnstile, solo detección de fingerprint, que sí es
razonable mitigar sin cruzar ninguna línea).

**Cacheo:** refresco cada 1 hora (no en vivo por request) — reduce la carga
sobre la cuenta visora y el riesgo de que Capcom note actividad inusual.
Implica una tabla `cfn_profiles` (cache) y un job programado, no una consulta
directa en el endpoint público.

**Estado actual:** Implementado y **verificado contra los 8 perfiles
reales** — el login manual con reuso de sesión funcionó, y los selectores
de extracción se ajustaron contra el HTML real (character_name, master_rating,
league_points confirmados exactos contra las capturas de Seba). El rango
en texto (`league_rank`) no se extrae — Capcom lo renderiza como imagen,
sin nombre en el DOM; se prioriza mostrar MR/LP en su lugar.

## 13. Deuda técnica conocida / decisiones pendientes

- Titularidad de la app de Twitch Developer Console: pendiente que el CEO
  decida si la registra con una cuenta institucional o se registra
  temporalmente con la cuenta del desarrollador, con plan de migración.
- Catálogo de roles puede crecer; el modelo ya lo soporta sin cambios de
  esquema (solo insertar filas en `roles`).
