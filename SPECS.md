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
  AckermanFG `1733837998`, TDF Super Ñema `1964247128` — más comunidad
  cercana al club sin rol formal de staff: Jager Eins `2281859090`,
  Zackito `2449521700`
- Escena chilena: Younghou `1027356162`, Pochoclo23 `3987753314`

**Sacados del sitio (temporal): Craime `1009159858`, Blaz `3381453962`.**
Se habían agregado sin consultarles personalmente si querían aparecer —
Seba decidió sacarlos del `PLAYERS` dict y del array del frontend hasta
confirmar con ellos directamente. Sus datos ya guardados en
`cfn_profiles`/`cfn_matches` no se borraron (no hace daño que queden ahí,
sin mostrarse), así que reponerlos cuando confirmen es tan simple como
agregar de nuevo estas dos líneas en ambos lugares.

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

### 12.1 Historial de partidas (win rate por rango de días) — en progreso

Objetivo: mostrar win rate y personajes usados en las últimas 24h/72h por
jugador, no solo el estado actual del perfil. Requiere datos partido por
partido (personaje, rival, resultado, fecha), que viven en la pestaña
"History" del perfil de Buckler's Boot Camp — una página/pestaña distinta
a la que ya scrapeamos, con su propia estructura HTML todavía no vista.

**Por qué se guarda en nuestra propia tabla y no se consulta en vivo:**
Buckler's Boot Camp probablemente solo muestra las últimas N partidas — si
alguien no juega seguido, "los últimos 3 días" podrían no estar completos
en su página en el momento en que consultamos. Guardando cada partida que
vemos, corrida a corrida del cron, armamos nuestro propio historial
confiable con el tiempo, independiente de cuánta ventana muestre el sitio.

**Modelo:** `cfn_matches` (`app/models/cfn_match.py`) — cfn_id, personaje
usado, nombre y personaje del rival, resultado (`won`, nullable si no se
pudo determinar), `played_at` (fecha real de la partida, no la fecha en
que la guardamos). Constraint único en (`cfn_id`, `played_at`,
`opponent_name`) para no duplicar la misma partida entre corridas del
cron, que van a ver partidas repetidas cada vez que el sitio muestra su
ventana de "últimas N".

**Estado actual:** modelo, migración, y **extracción de partidas
implementada y verificada** — los selectores se confirmaron exactos
contra el HTML real de 10 partidas (fecha, rival, resultado, personaje
propio y del rival), incluyendo el caso de cambio de personaje a mitad de
sesión. La integración a `refresh_cfn.py` está probada de punta a punta
contra Postgres real: primera corrida guarda las partidas nuevas, segunda
corrida las reconoce como ya vistas y no duplica nada (constraint único
por `cfn_id` + `played_at` + `opponent_name`).

**Sin verificar todavía (necesita a Seba):** ~~que `get_match_history`
corra contra el sitio real~~ — **CONFIRMADO:** corrida real completa
contra el sitio en vivo, 80 partidas encontradas entre los 8 jugadores,
guardadas sin error en Postgres (después de aplicar la migración pendiente
también al Postgres local, que solo se había migrado en Supabase — ver
`lessons.md`). Segunda corrida a confirmar que dedupe correctamente contra
datos reales (ya se probó la lógica con datos mockeados, falta la
confirmación en vivo).

**Pendiente:** ~~el endpoint de agregación... y la UI del filtro de
días~~ — **COMPLETADO:** `GET /cfn/players/{id}/matches?days=N` (público,
sin auth, valida `days` entre 1 y 30) agrega win rate y conteo de
personajes desde `cfn_matches`. Probado contra Postgres real con datos
sembrados a propósito en distintas ventanas de tiempo (1/3/30 días), y el
cliente TS del frontend (`getMatchStats`) probado end-to-end contra el
backend real. En `/jugadores` se agregó un selector 1D/3D/7D y una línea
de W-L/win rate/personajes por card, debajo de los datos de perfil que ya
había. Default del selector en 7 días (no 1) porque las partidas más
recientes que hay guardadas hoy tienen unos días — con 1 día por defecto
la página se vería vacía hasta que se acumulen partidas más nuevas.

## 13. Sistema de puntos — molde visual, sin mecánica real

`/puntos` existe como página (podio top 3 + tabla completa), con datos
placeholder — no hay ninguna acumulación real de puntos detrás todavía.

**Confirmado por el CEO** (Fase 2 del levantamiento de requerimientos):
"Minijuegos para rankeds de SF y canjes con TTS" — o sea, los puntos sí
tienen vida real, no son solo un mockup permanente. Falta definir:

- **Cómo se acumulan.** A diferencia del CFN tracker (que consulta un
  perfil público), esto necesita trackear actividad de cada espectador en
  tiempo real (tiempo viendo el stream, mensajes en el chat) — implica un
  bot propio o una extensión de navegador (referencia: cómo lo resuelve
  Elmiillor), no algo que se resuelva con un scrape puntual.
- **Dónde se guardan.** Tabla de usuarios de Twitch con su saldo de
  puntos — nueva pieza de modelo de datos, todavía no diseñada.
- **Para qué sirven.** El CEO ya confirmó canjes con TTS como mecánica de
  interés; falta el resto de la conversación con el staff sobre qué otros
  canjes tiene sentido (ver también notas de rewards en el levantamiento
  de requerimientos original).

No se avanza en la implementación real hasta tener esa definición — el
molde visual sirve para no bloquear el resto del sitio mientras tanto.

## 14. Deploy (staging)

**Topología:** Supabase (Postgres) + Render (backend/API) + Vercel
(frontend). Elegido sobre Fly.io por costo — Fly.io eliminó su capa
gratuita en 2024, Render sigue siendo gratis de verdad (con límites:
512MB RAM, se duerme a los 15 min sin tráfico, ~1 min de cold start).

**URLs reales (staging):**
- Frontend: `https://tdf-edeportes-gamma.vercel.app`
- Backend: `https://tdf-edeportes-backend.onrender.com`
- Base de datos: Supabase, proyecto `tdf-edeportes`, región São Paulo

**Supabase — conexión:** usar el **Session pooler**, no "Direct
connection". La conexión directa de Supabase resuelve solo por IPv6 salvo
que se pague el add-on de IPv4, y muchos entornos (WSL2/Docker incluidos)
no resuelven esos hosts — da `could not translate host name`. El Session
pooler es compatible con IPv4 sin configuración extra. El usuario en esa
connection string lleva el ID del proyecto pegado
(`postgres.PROJECT_ID`, no solo `postgres`) — es así a propósito.

**Render — variables de entorno del Web Service:** `DATABASE_URL` (Session
pooler de Supabase), `JWT_SECRET` (uno nuevo, generado para producción —
nunca reusar el de `.env` local), `JWT_EXPIRATION_MINUTES`,
`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI` (con el
dominio de Vercel), `DISCORD_WEBHOOK_URL` (vacío, sigue en pausa),
`CORS_ORIGINS` (lista JSON con el dominio de Vercel).

**Render — health check:** hay que fijar explícitamente el "Health Check
Path" a `/health` en Settings del servicio. Por defecto Render pega a `/`,
y como nuestra API no tenía nada ahí, devolvía 404 y Render mataba el
contenedor en loop pensando que estaba caído — se agregó además un
endpoint `GET /` de cortesía en `app/main.py` para no depender solo de esa
configuración.

**Render — límite conocido:** la capa Free no soporta "one-off jobs" según
su propio dashboard — esto es relevante para cuando se configure el Cron
Job del refresh de CFN (`scripts/refresh_cfn.py`), todavía no armado en
producción. Puede requerir plan pago para esa pieza puntual, o buscar otra
vuelta (ej. GitHub Actions con cron, pegándole al endpoint o corriendo el
script aparte).

**Vercel — configuración del proyecto:** Root Directory = `frontend`,
Framework Preset = Vite, variable `VITE_API_URL` apuntando al backend de
Render.

**Vercel — SPA routing:** hace falta `frontend/vercel.json` con un rewrite
de todas las rutas a `/index.html` — sin esto, cualquier navegación directa
a una ruta de React Router que no sea `/` (recargar con F5, o Twitch
redirigiendo a `/auth/callback`) da 404 servido por Vercel mismo, antes de
que React tenga oportunidad de cargar.

**Frontend — build command:** `tsc --noEmit && vite build`, no
`tsc -b`. El modo `-b` (build/project references) de TypeScript falló en
silencio en el entorno de build de Vercel (el log se cortaba sin ningún
mensaje de error justo después de invocarlo) — nunca se reprodujo local.
`--noEmit` hace el mismo chequeo de tipos sin el modo incremental, más
simple y más predecible entre entornos.

**CFN tracker en producción:** cron via **GitHub Actions**
(`.github/workflows/refresh-cfn.yml`), no Render Cron Job — la capa Free de
Render no soporta "one-off jobs", y GitHub Actions es gratis para repos
públicos sin ese límite. Corre cada hora, instala Chromium en cada corrida
(no hay estado persistente entre ejecuciones, cada una es una VM nueva),
reconstruye `cfn_session.json` desde el secret `CFN_SESSION_JSON` de
GitHub (nunca se commitea) y usa el secret `DATABASE_URL` (Session pooler
de Supabase) para escribir el resultado en la base real.

## 15. Branding real (16-08-2026)

El diseñador del equipo entregó el logo oficial: mascota (mono rojo con
guantes/vendas de boxeo, llamas magenta/púrpura de fondo) + wordmark
"TDF" estilo grafiti, y el wordmark solo. Los tres con transparencia real
(no un fondo blanco pegado), redimensionados y convertidos a WebP para no
mandar PNGs de varios MB a producción.

**Dónde vive cada archivo** (`frontend/public/brand/`):
- `logo-full.webp` — mascota + wordmark completo. En uso en el hero del
  Home y en `/nosotros`.
- `logo-full-alt.webp` — variante alternativa del mismo logo completo (el
  diseñador mandó dos renders ligeramente distintos — el `-alt` tiene el
  glow con más saturación pero el crop del render original tocaba el
  borde superior del canvas, indicio de que puede estar más justo de
  margen arriba). **No se usa por defecto, queda disponible.** Si el
  equipo prefiere esta versión sobre `logo-full.webp`, es cuestión de
  cambiar la referencia en `HomePage.tsx` y `NosotrosPage.tsx`.
- `logo-wordmark.webp` — solo el texto "TDF" en grafiti, sin la mascota.
  En uso en el Navbar y el Footer (más compacto, entra bien en una barra
  horizontal angosta).
- `icon-512.png` — crop cuadrado de la cara de la mascota, usado como
  `apple-touch-icon` y `og:image` (vista previa al compartir el link).
- `favicon.ico` (en `frontend/public/`, no en `brand/`) — generado del
  mismo crop cuadrado, tamaños 16/32/48px.

**De paso, corregido con la información real de "About" de Twitch**
(capturada 16-08-2026): el link de Discord que estaba en el sitio
(`t6gkWX6j6M`) no era el correcto — el real es
`https://discord.gg/2qV394FD9w`. Se agregaron también Instagram
(`tdf_edeportes`) y X (`@TDFedeportes`), que están en los canales
oficiales del club pero nunca se habían linkeado desde el sitio.

**`/nosotros` reescrito** con el copy real del "About" de Twitch
(¿Quiénes somos? / ¿Qué hacemos? / ¿Cómo aporto?), reemplazando el texto
genérico que había puesto Claude como placeholder al bootstrapear el
proyecto.

## 16. Tier list (16-08-2026, rediseñada el mismo día)

`/tierlist` — herramienta para armar tier lists, pensada para usarse en
stream. Idea de Seba, inspirada en TierMaker.

**Rediseño importante (mismo día, segunda vuelta):** se sacaron los
rosters propios de SF6 y Third Strike como "modos de juego" — ya no
existen como opción incorporada al sitio. Todo el contenido ahora sale
de **plantillas creadas por la comunidad**, públicas, listadas con el
nombre de quien las armó. Esto además resuelve de raíz la discusión de
copyright que se dio dos veces con Seba sobre usar retratos de
personajes: como ya no hay ningún roster provisto por el sitio, el 100%
del contenido de imágenes es subido por la propia comunidad — el sitio
pasa a ser un alojador de contenido de terceros de verdad, no alguien
publicando el roster de Capcom como plantilla propia. `characterColors.ts`
(el mapa de colores por personaje) se mantiene igual, pero ya no cumple
el rol de "roster incorporado" — solo sigue coloreando texto en
`/jugadores`, y de forma oportunista si alguien nombra un personaje real
en un ítem sin imagen de una plantilla comunitaria.

**Regla de acceso (sin cambios respecto a la primera versión, pero ahora
aplicada de forma más limpia):**
- **Crear una plantilla nueva** (con imágenes subidas) requiere login con
  Twitch — son imágenes de la persona, quedan asociadas a su cuenta.
- **Ranquear una plantilla ya existente** es libre para cualquiera, sin
  necesitar cuenta — mismo criterio que TierMaker.

**Diseño de seguridad importante:** `POST /tierlists` (guardar un
ranking) **no acepta imágenes directamente** — solo `template_id` + los
IDs de los ítems de esa plantilla en cada tier. El backend resuelve el
ítem real (con su imagen) desde la plantilla guardada en la base, nunca
confía en datos de imagen que vengan del cliente en esa ruta. Sin esto,
cualquiera sin login podría inyectar una imagen nueva saltándose por
completo el requisito de login de `POST /tierlist-templates` — quedó
probado explícitamente (batería de pruebas contra Postgres real:
intentar "colar" un ítem que no pertenece a la plantilla da 400).

**Backend:**
- `TierListTemplate` (`tier_list_templates`): `id`, `name`, `created_by`
  (FK a `users`, requiere login para crearla), `items` (jsonb). Pública
  de lectura: `GET /tierlist-templates` (lista todas, con
  `creator_name`) y `GET /tierlist-templates/{id}` (detalle completo con
  imágenes) — ninguna de las dos requiere login, para que cualquiera
  pueda elegir y ranquear una plantilla sin cuenta. Solo el `POST` exige
  login.
- `TierList` (`tier_lists`): `id` (uuid, es el link para compartir),
  `template_id` (FK nullable a `tier_list_templates` — nullable para que
  un ranking guardado sobreviva aunque la plantilla original se borre
  después), `tiers` (jsonb, foto congelada de cómo quedó ranqueado, con
  los ítems completos copiados de la plantilla en el momento de guardar).
  `POST /tierlists` sin auth (ranking libre para cualquiera).
- Validación de imágenes (formato + tamaño máximo ~150KB en base64) vive
  solo en `POST /tierlist-templates` ahora — es el único lugar donde
  entra contenido nuevo al sistema.

**Frontend (`/tierlist`):**
- Pantalla inicial: grilla de plantillas de la comunidad (nombre, cuántos
  ítems, quién la creó) para elegir una y empezar a ranquear. Si hay
  sesión iniciada, botón para crear una plantilla nueva (subir imágenes,
  redimensionadas a 120x120 con `<canvas>` en el navegador antes de
  mandarlas a cualquier lado, comprimidas a WebP).
- Una vez elegida/creada una plantilla: el editor de siempre (tiers
  editables — agregar, sacar, reordenar, renombrar sin romper dónde están
  guardados los ítems — drag and drop, exportar PNG/portapapeles, guardar
  y compartir por link).
- `/tierlist/:id`: vista de solo lectura del link compartido.

**Idioma:** se encontraron y corrigieron conjugaciones de voseo argentino
("armá", "arrastrá", "podés", etc.) coladas en el texto visible de
`/tierlist` y también en `/nosotros` (en el texto que se había reescrito
a partir del "About" real de Twitch, que en su versión original sí
estaba en tú-form correcto — el error fue mío al reescribirlo). Barrido
completo hecho sobre todo `frontend/src` para confirmar que no quedó
ningún otro rastro. Regla para cualquier texto nuevo de ahora en más:
tú-form siempre ("arma", "arrastra", "agrega", "puedes"), nunca vos-form
("armá", "arrastrá", "agregá", "podés") — Seba es chileno, no argentino,
y lo marcó como una regla que no admite excepciones.

**Decisión de moderación (sigue vigente, ya no depende de la distinción
sf6/3s/custom):** ninguna imagen entra al sistema sin pasar por el login
de creación de plantilla — no hay ningún camino anónimo para subir
contenido, solo para usarlo. No se implementó un proceso formal de DMCA
(agente registrado, política pública, etc.) — para eso haría falta más
que código, es papeleo legal real que un club de hobby probablemente no
necesita todavía, pero vale la pena tenerlo en mente si el uso crece.

## 17. Deuda técnica conocida / decisiones pendientes

- Titularidad de la app de Twitch Developer Console: pendiente que el CEO
  decida si la registra con una cuenta institucional o se registra
  temporalmente con la cuenta del desarrollador, con plan de migración.
- Catálogo de roles puede crecer; el modelo ya lo soporta sin cambios de
  esquema (solo insertar filas en `roles`).
