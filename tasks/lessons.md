# lessons.md — lecciones aprendidas

> Se actualiza después de cualquier corrección del usuario durante el
> desarrollo. Formato: qué pasó, por qué, regla para no repetirlo.

## `docker compose restart` no relee cambios en `.env`

**Qué pasó:** se agregaron `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` al
`.env` después de que el contenedor `backend` ya existía. Todos los
`docker compose restart backend` posteriores siguieron corriendo con esas
variables vacías — Twitch devolvió `{"status":400,"message":"missing client id"}`
al armar la `authorize_url` con `client_id=` vacío.

**Por qué:** las variables de `env_file` se inyectan al contenedor en el
momento en que se *crea* (`up`), no en cada `restart`. `restart` reinicia el
proceso del contenedor existente tal cual estaba, sin releer el `.env`.

**Regla:** después de cualquier cambio en `.env`, usar
`docker compose up -d --force-recreate <servicio>` (o `up -d` a secas si
Compose detecta el cambio de config), nunca `restart`, para que las
variables nuevas lleguen al contenedor.

**Qué pasó:** un `curl` con continuación de línea (`\` al final, headers en
líneas separadas) se ejecutó como varios comandos sueltos — `curl -X POST ...`
sin headers ni body, seguido de `-H: command not found` y `-d: command not found`.
El endpoint respondió 403 porque nunca recibió el token, no porque el código
esté mal.

**Por qué:** al copiar texto multilínea desde una fuente en Windows (o
Windows Terminal en ciertas configuraciones) hacia bash en WSL2, a veces se
cuela un `\r` al final de la línea con el `\`. Bash ve `\<CR><LF>` en vez de
`\<LF>`, así que la continuación de línea no se interpreta y cada línea corre
como comando independiente.

**Regla:** cualquier comando que le pase a Seba para correr en WSL2 y que
tenga headers/flags en líneas separadas con `\`, lo doy como **un solo
comando en una línea**, sin continuaciones. Más verboso de leer, pero cero
riesgo de que el pegado lo rompa.

**Qué pasó:** se commiteó `.env` y varios `__pycache__/*.pyc` en el primer
commit del bootstrap, a pesar de que `.gitignore` los cubría.

**Por qué:** el zip se generó con `zip -qr out.zip . -x "*.git*"` para excluir
la carpeta `.git`. Ese patrón hace *substring match*, así que también excluyó
`.gitignore` (contiene la subcadena `.git`) — el archivo nunca llegó al
paquete entregado, y sin él `git add .` no tenía nada que filtrar.

**Regla:** al excluir `.git/` de un zip, usar `-x ".git/*"` (con la barra),
nunca `"*.git*"`. Después de generar cualquier zip de entrega, correr
`unzip -l` y confirmar explícitamente que `.gitignore` está en el listado
antes de entregarlo.

**Qué pasó:** `tsc -b` falló con `Property 'env' does not exist on type 'ImportMeta'`
al usar `import.meta.env.VITE_API_URL` en `src/lib/api.ts`.

**Por qué:** TypeScript no conoce las variables inyectadas por Vite a menos
que el proyecto declare explícitamente los tipos del cliente de Vite.

**Regla:** todo proyecto Vite + TS de este repo debe incluir
`src/vite-env.d.ts` con `/// <reference types="vite/client" />` desde el
bootstrap, antes de escribir el primer `import.meta.env.*`.

## Faltaba validar que un evento no se cree en el pasado

**Qué pasó:** Seba probó crear un evento con fecha/hora ya pasada y el
backend lo aceptó sin problema — bug real encontrado por prueba manual.

**Por qué:** `EventCreate` (schema de creación) no tenía ningún validador
sobre `start_at` más allá del tipo de dato. Nada en el modelo de negocio
documentado en SPECS.md decía explícitamente "no se puede agendar en el
pasado", así que no estaba contemplado desde el diseño original.

**Regla:** al definir un schema de creación, preguntarse explícitamente qué
rangos de valores son inválidos en el mundo real (fechas pasadas, negativos,
etc.), no solo el tipo. La validación se puso en `EventCreate` con margen de
5 minutos (para no romper por latencia/desincronización de reloj) y
deliberadamente NO en `EventBase` (la comparten `EventRead`/`EventUpdate`),
porque validarla ahí rompería la lectura de eventos ya existentes en el
pasado. Queda pendiente decidir si `EventUpdate` también debería bloquear
mover un evento futuro hacia el pasado — hoy no lo hace.

## str_replace duplicó una etiqueta JSX en vez de reemplazarla

**Qué pasó:** al sacar un em-dash de `DashboardPage.tsx`, el `old_str` que
usé no coincidía con el contenido real del archivo (tenía una versión
vieja en la cabeza de una edición anterior), y el resultado fue una
etiqueta `<h2>` duplicada en vez de reemplazada — rompió el build con
"JSX element has no corresponding closing tag".

**Por qué:** edité un archivo sin volver a mirar su contenido actual justo
antes, confiando en una versión mental desactualizada tras varias ediciones
en la misma sesión.

**Regla:** antes de un `str_replace` sobre un archivo que ya se tocó varias
veces en la misma sesión, revisar el bloque exacto con `view` primero — no
asumir que se recuerda bien después de muchos cambios acumulados.

## /calendario (público) y /dashboard (staff) terminaron siendo casi el mismo componente

**Qué pasó:** Seba, logueado como staff, entró a /calendario esperando poder
agregar/editar/borrar eventos ahí mismo, y no podía — esa página era
deliberadamente de solo lectura, la edición vivía en /dashboard, una ruta
aparte con casi el mismo layout duplicado.

**Por qué:** al planear el sitemap separé "vista pública" de "dashboard
staff" como si fueran necesariamente páginas distintas, sin cuestionar si
el mismo componente podía comportarse distinto según el rol de quien lo ve.
Terminaron siendo dos implementaciones del mismo calendario mantenidas en
paralelo.

**Regla:** antes de separar una funcionalidad en "versión pública" +
"versión staff" como rutas distintas, preguntarse si en realidad es la
misma pantalla con permisos distintos — la mayoría de las veces sí lo es, y
una sola implementación staff-aware es más simple de mantener que dos
sincronizadas a mano. `/dashboard` quedó como redirect a `/calendario` por
si alguien tenía el link guardado.

## `--force-recreate` no reconstruye la imagen, solo el contenedor

**Qué pasó:** se agregó `playwright` a `requirements.txt` y se cambió el
`Dockerfile` (instalación de Chromium), pero `docker compose up -d
--force-recreate backend` siguió usando la imagen vieja sin esos cambios —
`ModuleNotFoundError: No module named 'playwright'` al correr el script.

**Por qué:** `--force-recreate` fuerza que el contenedor se recree (útil
para que tome variables de entorno nuevas, como ya vimos), pero no dispara
un rebuild de la imagen. Si cambió `requirements.txt`, el `Dockerfile`, o
cualquier archivo que se copia durante el build, hace falta `--build`
además.

**Regla:** cambios en `.env` → `--force-recreate` alcanza. Cambios en
`requirements.txt`/`package.json`/`Dockerfile` → hace falta `--build`
(se puede combinar: `up -d --build --force-recreate <servicio>`).

## `python:3.12-slim` corre sobre Debian trixie, y Playwright todavía no lo soporta

**Qué pasó:** `playwright install --with-deps chromium` falló durante el
build con `Package 'ttf-unifont' has no installation candidate` — el
instalador de Playwright no tiene una lista de dependencias oficial para
Debian trixie (la versión que hoy trae la tag "slim" de la imagen de
Python), y cae a un fallback pensado para Ubuntu 20.04 con nombres de
paquete que ya no existen.

**Por qué:** instalar Chromium + sus dependencias de sistema a mano sobre
una imagen genérica es frágil — depende de que el instalador de Playwright
tenga soporte explícito para la distro/versión exacta de esa imagen en ese
momento, y eso cambia con el tiempo sin que nosotros toquemos nada.

**Regla:** para cualquier dependencia que necesite un navegador headless
(Playwright, Puppeteer, etc.), usar la imagen Docker oficial del proyecto
(`mcr.microsoft.com/playwright/python:v<version>-<codename ubuntu>`) en vez
de instalar el navegador a mano sobre una imagen genérica — viene
versionada y probada junto con la librería, evita este tipo de
incompatibilidad silenciosa. Mantener la versión de la imagen sincronizada
con la versión de `playwright` en `requirements.txt`.

## `headless=False` no funciona dentro de un contenedor Docker

**Qué pasó:** el modo `--debug` de `refresh_cfn.py` intentaba lanzar
Chromium con `headless=False` para que Seba "viera" el navegador — reventó
con `Missing X server or $DISPLAY` al primer intento real.

**Por qué:** un contenedor Docker no tiene servidor gráfico (X server), y
aunque lo tuviera, `docker compose exec` no reenvía ventanas a la pantalla
de quien ejecuta el comando. Diseñé el modo debug pensando en cómo se vería
corriendo en una laptop normal, sin considerar que esto corre dentro de un
contenedor.

**Regla:** cualquier automatización de navegador que corra dentro de
Docker va siempre `headless=True`, sin excepción. Para debuggear, lo único
que sirve ahí adentro es capturar evidencia (screenshots, HTML, logs), no
una ventana visible — que es exactamente lo que `_debug_dump()` ya hacía
bien, el error estaba en la línea de al lado.

## Capcom bloquea Chromium automatizado con un 403 de CloudFront, antes de llegar al login

**Qué pasó:** la primera corrida real llegó hasta el 403 en el paso más
temprano posible — ni siquiera cargó el formulario de login, CloudFront
cortó la petición completa con "Request blocked".

**Por qué:** Playwright con configuración por defecto deja huellas de
automatización fácilmente detectables (navigator.webdriver=true, el flag
--enable-automation, headers en un orden no-humano). Sitios grandes con
WAF (CloudFront + probablemente AWS WAF bot control, en este caso) filtran
eso antes de servir contenido.

**Regla / mitigación aplicada:** `playwright-stealth` (v2.x, la v1.0.6
está rota — depende de `pkg_resources` que las versiones nuevas de
setuptools ya no incluyen) envuelto sobre `sync_playwright()`, un User-Agent
de navegador real explícito, locale/timezone/viewport de un usuario real
(es-CL, America/Santiago), el flag `--disable-blink-features=
AutomationControlled`, y "calentar" la sesión entrando primero a la home
del sitio antes de ir directo al login. Ninguna de estas técnicas es
garantía contra un WAF moderno — es la mejor práctica estándar, puede
seguir sin alcanzar.

## El login de Capcom ID está detrás de Cloudflare Turnstile — no se automatiza

**Qué pasó:** tras resolver el 403 de CloudFront con stealth, el siguiente
paso del login (auth.cid.capcom.com) mostró un checkbox de Cloudflare
Turnstile ("Verifique que es un ser humano"). No es fingerprinting pasivo,
es un desafío de verificación humana activo.

**Decisión:** no se automatiza resolver Turnstile. Es un límite deliberado,
no una limitación técnica — hay servicios de terceros que "resuelven"
CAPTCHAs automáticamente, pero construir eso es circunvalar a propósito un
sistema anti-bot ajeno, y eso no se hace acá sin importar cuán inocente sea
el uso final.

**Solución:** reuso de sesión autenticada manualmente por un humano (Seba
se loguea normal, exporta cookies con Cookie-Editor, el scraper las carga
en vez de loguearse). Ver SPECS.md §12 para el paso a paso completo. La
sesión vence eventualmente y hay que repetir el export a mano — costo
aceptable para un proyecto de este tamaño.

**Regla:** cuando un scraper se topa con un CAPTCHA/challenge de
verificación humana real (no solo detección de fingerprint), la respuesta
correcta es reusar una sesión autenticada por un humano, no intentar
resolver el challenge programáticamente.

## El rango de SF6 (MASTER, GRAND MASTER, etc.) se renderiza como imagen, no texto

**Qué pasó:** con los HTML reales de los 8 perfiles, se confirmó que
`league_rank` no tiene forma limpia de extraerse — el nombre del rango no
es texto en el DOM, es un `<img>` (`rank36_s.png`, `alt=""`). El MR y el LP
sí son texto real, y se verificaron exactos contra los 8 perfiles.

**Por qué:** decisión de diseño de Capcom, no algo que dependa de nuestro
selector — el badge visual del rango es una imagen, el número de MR/LP
sí vive como texto plano.

**Regla:** no perseguir `league_rank` como texto — mostrar MR/LP
directamente en la UI, que es información igual de útil (cualquiera de la
escena de FGC sabe leer esos números) y sí es extraíble de forma confiable.
El campo `league_rank` queda en el modelo por si algún día se arma un mapeo
manual ícono→nombre, pero no se lo trata como requerido para mostrar datos.

## `wait_until="networkidle"` cuelga en páginas con widgets de fondo

**Qué pasó:** `refresh_cfn.py` empezó a fallar con `Timeout 30000ms
exceeded` en `page.goto(..., wait_until="networkidle")` para varios
jugadores, después de haber andado bien una vez antes.

**Por qué:** `networkidle` espera a que no haya ninguna conexión de red
por 500ms seguidos. La página de perfil tiene un widget de cookies
(Cookiebot) y probablemente analytics/telemetría corriendo en el fondo que
nunca la dejan del todo "quieta" — a veces cae dentro de la ventana de
30s por casualidad, a veces no. Es un timing flaky, no un problema
determinístico del selector ni de la sesión.

**Regla:** para páginas con actividad de red de fondo continua (widgets de
terceros, analytics, polling), usar `wait_until="domcontentloaded"` en vez
de `"networkidle"`, y esperar puntualmente por el elemento específico que
se necesita con `locator.wait_for()` — es más rápido y más confiable que
esperar a que toda la red se calle, que puede no pasar nunca.

## El volumen anónimo de node_modules sobrevive a rebuilds con --no-cache

**Qué pasó:** después de agregar `react-icons` a `package.json` y correr
`docker compose build --no-cache frontend`, el contenedor seguía sin tener
el paquete instalado — `Failed to resolve import "react-icons/si"`.

**Por qué:** `docker-compose.yml` monta `/app/node_modules` como volumen
anónimo (separado del bind mount de `./frontend:/app`) para que el
`node_modules` de dentro del contenedor no se pise con el del host. Ese
volumen se crea una vez y Docker Compose lo **reutiliza** en cada `up`,
independientemente de que la imagen se reconstruya desde cero — el
`node_modules` fresco que quedó en la imagen nueva nunca llega a verse,
tapado por el volumen viejo.

**Regla:** cuando se agrega/cambia una dependencia de `package.json`, el
rebuild de imagen NO alcanza por sí solo — hace falta
`docker compose up -d --force-recreate --renew-anon-volumes <servicio>`
para que el volumen anónimo de `node_modules` también se recree. Nunca usar
`docker compose down -v` para esto — borra también los volúmenes con
nombre (como el de Postgres), no solo los anónimos.

## Supabase "Direct connection" es solo IPv6 sin el add-on pago de IPv4

**Qué pasó:** `alembic upgrade head` contra la connection string de "Direct
connection" de Supabase dio `could not translate host name`, con
credenciales correctas.

**Por qué:** Supabase resuelve esa conexión solo por IPv6 salvo que se
pague el add-on de IPv4 — y bastantes entornos (WSL2/Docker entre ellos) no
tienen IPv6 bien configurado, así que el hostname nunca resuelve.

**Regla:** usar siempre el **Session pooler** de Supabase para conexiones
desde entornos que no garanticen IPv6 (prácticamente todos). El usuario de
esa connection string lleva el ID del proyecto pegado
(`postgres.PROJECT_ID`), es así a propósito, no es un error de copiado.

## Render mata el contenedor en loop si el health check por defecto (`/`) da 404

**Qué pasó:** el backend se desplegó bien ("Live"), pero el log mostraba
"Shutting down" segundos después, en un ciclo — no era el sleep por
inactividad (eso tarda 15 min).

**Por qué:** Render pega por defecto a `/` para el health check. Nuestra
API no tenía ningún endpoint ahí (solo `/health`), así que devolvía 404 y
Render interpretaba eso como "el servicio no está sano".

**Regla:** en cualquier deploy en Render, configurar explícitamente el
"Health Check Path" en Settings a una ruta que sí devuelva 200 — y además,
buena práctica general, que la API tenga *algo* en `/` (aunque sea un
mensaje básico) para no depender de un solo punto de configuración externo.

## `tsc -b` falla en silencio en el entorno de build de Vercel

**Qué pasó:** el build de Vercel se cortaba sin ningún mensaje de error
justo después de invocar `tsc -b`, tanto la primera vez como reintentando
— nunca se reprodujo local ni en Docker.

**Por qué:** no queda claro del todo (Vercel no dio ningún log adicional),
pero `-b` es el modo de "project references" de TypeScript, pensado para
proyectos con múltiples sub-proyectos — nuestro `tsconfig.json` es de un
solo proyecto plano, así que usar `-b` era innecesariamente más complejo
de lo que el proyecto necesita.

**Regla:** usar `tsc --noEmit` para chequeo de tipos en el build de una
SPA de un solo proyecto — hace lo mismo sin el modo incremental/build que
resultó frágil entre entornos.

## Una SPA en Vercel necesita un rewrite explícito o cualquier ruta que no sea "/" da 404

**Qué pasó:** Twitch redirigía correctamente a
`.../auth/callback?code=...`, pero Vercel devolvía su propio 404 antes de
que React Router pudiera cargar la página.

**Por qué:** Vercel sirve archivos estáticos — sin configuración adicional,
busca un archivo real en `/auth/callback` (no existe, es una ruta que
React Router resuelve en el navegador) y da 404 antes de servir
`index.html`. Pasa con cualquier navegación "dura" a una ruta que no sea
la raíz: F5 en `/calendario`, un link compartido directo, o un redirect
externo como el de Twitch.

**Regla:** cualquier SPA deployada en Vercel necesita un `vercel.json` con
un rewrite de todas las rutas a `/index.html`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## El calendario solo marcaba el día de inicio de un evento, ignorando el rango completo

**Qué pasó:** un evento de varios días (ej. un torneo viernes a domingo)
solo aparecía marcado en el calendario el día de inicio.

**Por qué:** el agrupamiento de eventos por día comparaba únicamente
`start_at` contra cada celda del calendario, sin considerar `end_at` para
nada — ni en los puntos del calendario ni en la lista del día seleccionado.

**Regla:** cualquier feature de calendario que muestre eventos "por día"
tiene que pensar en términos de rango (`start_at` a `end_at`), no de una
fecha puntual, desde el diseño inicial — se agregó `eventDateKeys()` como
utilidad centralizada para esto, reusada en el grid del calendario y en la
lista de eventos del día.

## Un secret de GitHub Actions tenía la DATABASE_URL local, no la de Supabase

**Qué pasó:** la primera corrida del cron en GitHub Actions falló con
`could not translate host name "db"` — un error de conexión, pero contra
un host que no existe fuera de Docker local.

**Por qué:** al cargar el secret `DATABASE_URL` en GitHub, se pegó por
error la URL de `docker-compose.yml` (`db`, el nombre del servicio de
Postgres dentro de la red interna de Docker), en vez de la connection
string real del Session pooler de Supabase.

**Regla:** cuando un mismo nombre de variable (`DATABASE_URL`) tiene que
cargarse en varios lugares (local `.env`, Render, GitHub Secrets), no dar
por sentado que se copió el valor correcto a cada uno — confirmar
explícitamente cuál de las 2-3 URLs posibles (local, Supabase directo,
Supabase pooler) corresponde a cada destino antes de darlo por cargado.

## El banner de cookies (Cookiebot) bloquea clicks aunque ya no se vea en pantalla

**Qué pasó:** `dump_match_history_debug` falló repetidas veces intentando
clickear la pestaña "History" — Playwright encontraba el elemento
correcto, pero distintos elementos (`intercepts pointer events`) tapaban
el click cada vez que reintentaba.

**Por qué:** la primera captura (antes del click) muestra el banner de
consentimiento de cookies (Cookiebot) tapando buena parte de la página. En
capturas posteriores ya no se ve, pero el DOM/la posición de otros
elementos seguía interfiriendo con la coordenada del click — típico de un
banner que "desaparece visualmente" (se desvanece, se scrollea) sin que su
nodo deje de ocupar espacio o de interceptar eventos.

**Regla:** en cualquier scraping de un sitio con banner de cookies,
aceptarlo/cerrarlo explícitamente ANTES de intentar cualquier otra
interacción — con un timeout corto y sin frenar el flujo si no aparece
(algunos usuarios/sesiones ya lo tienen aceptado). Como red de seguridad
adicional, si un click normal falla por intercepción después de eso,
reintentar con `force=True` — válido acá porque ya se confirmó por
capturas anteriores que el elemento es el correcto, no una adivinanza.

## Un mismo nombre de clase CSS se repite en el header y en el contenido — el selector agarró el elemento equivocado

**Qué pasó:** el click a "History" no tiraba error (con `force=True`
"funcionaba"), pero la pantalla seguía mostrando la pestaña "Overview" —
el click no estaba fallando, estaba clickeando otra cosa.

**Por qué:** la clase `backler_header_text__yq0mF` se reutiliza en TODO
el sitio, no solo en la barra de pestañas del perfil — también está en
los ítems del menú desplegable "AVATAR ROOM" del header, que también
tiene un link que dice "History" (pero es el historial de personalización
del avatar, nada que ver). `get_by_text("History", exact=True).first`
agarró el primero que aparece en el DOM, que resultó ser ese, no la
pestaña del perfil.

**La solución real, mejor que arreglar el selector:** inspeccionando el
HTML se encontró que la pestaña "History" del perfil es en realidad un
link con href real (`/profile/{cfn_id}/battlelog`), no un tab controlado
por JS. Navegar directo ahí es más simple y más confiable que cualquier
selector de texto — cero ambigüedad, cero problema de banners de cookies
o elementos que interceptan el click.

**Regla:** antes de simular un click en algo que "parece" un tab, revisar
el HTML real primero — capaz es un link normal con URL propia, y navegar
directo ahí es siempre más robusto que clickear. Y cuando un selector por
texto sea ambiguo (mismo texto en varios lugares de la página), preferir
algo más específico que ".first" a ciegas — `.first` toma lo que sea que
aparezca primero en el DOM, no necesariamente lo que se ve primero en
pantalla ni lo que uno tiene en mente.

## La verificación con lxml/cssselect contra HTML real capturado sirve como red de seguridad antes de tocar producción

**Qué pasó:** para `get_match_history()`, en vez de escribir los
selectores y esperar a que Seba los probara en vivo (como pasó varias
veces con el perfil), se probaron primero con `lxml`/`cssselect` contra el
HTML real que ya había mandado — confirmando los 10 resultados exactos
contra la captura de pantalla antes de integrar nada a `refresh_cfn.py`.

**Por qué vale la pena como práctica:** cada iteración con Seba cuesta un
build, un comando, y una vuelta de mensajes — cuando ya se tiene HTML real
capturado (aunque sea de una corrida anterior con otro propósito), probar
los selectores contra ese HTML estático con lxml antes de pedir otra
corrida real ahorra una vuelta completa, y a veces dos.

**Regla:** cuando exista HTML real ya capturado de un intento anterior
(aunque haya sido para otra cosa), probar cualquier selector nuevo contra
ese HTML con lxml/cssselect antes de pedirle a Seba que corra algo de
nuevo — es gratis, rápido, y agarra errores de sintaxis/lógica del
selector sin gastar una vuelta de ida y vuelta.

## La migración se aplicó a Supabase pero no al Postgres local — dos bases, dos estados

**Qué pasó:** `refresh_cfn.py` corriendo localmente (`docker compose exec
backend ...`, sin override de `DATABASE_URL`) falló con
`relation "cfn_matches" does not exist` — la tabla sí existía en Supabase
(donde se corrió la migración con `-e DATABASE_URL=...`), pero nunca se
aplicó al Postgres local del `docker-compose.yml`.

**Por qué:** desde que el proyecto tiene dos bases (local para desarrollo,
Supabase para producción), cada `alembic upgrade head` migra una sola de
las dos según qué `DATABASE_URL` esté activo en ese momento — no hay nada
que las mantenga sincronizadas automáticamente.

**Regla:** cada vez que se genera una migración nueva, aplicarla
explícitamente en **ambas** bases — el comando normal
(`docker compose exec backend alembic upgrade head`) para local, y el
comando con `-e DATABASE_URL=...` para Supabase — no asumir que una
implica la otra.

## Archivos de debug se colaron a un repo público porque el .gitignore era demasiado específico

**Qué pasó:** `git add -A` subió `debug_output/debug_output/history_*.html`
y `.png` al repo público de GitHub — capturas y HTML de debug que nunca
debieron commitearse.

**Por qué:** el `.gitignore` tenía `backend/debug_output/`, pensado para
cuando esa carpeta vive dentro de `backend/` (que es donde el propio
código la crea, vía `DEBUG_DIR` en `cfn_scraper.py`). Pero
`docker compose cp backend:/app/debug_output ./debug_output` se corrió
parado en la raíz del repo, así que la copia local terminó en
`~/tdf-edeportes/debug_output/` — una ruta que el patrón específico no
cubría.

**Regla:** para carpetas de artefactos/debug que pueden terminar en más de
un lugar según desde dónde se corra un comando, usar un patrón de
`.gitignore` sin prefijo de ruta (`debug_output/` en vez de
`backend/debug_output/`) — cubre la carpeta sin importar en qué nivel
aparezca. No es sensible en este caso (son capturas de pantalla, no
credenciales), pero igual no debería vivir en el repo — repos públicos en
particular no deberían acumular basura de debug, más si se usan de
portafolio.

## Las 80 partidas reales se guardaron en Postgres local, no en Supabase — otra vez las dos bases

**Qué pasó:** `/jugadores` en producción (Vercel + Render + Supabase) mostraba
"Sin partidas en este período" incluso con el filtro en 7D, a pesar de que
`refresh_cfn.py` había guardado 80 partidas reales sin error.

**Por qué:** esa corrida se hizo con `docker compose exec backend python
scripts/refresh_cfn.py`, sin el override `-e DATABASE_URL=...` de Supabase
— exactamente el mismo patrón que ya había pasado con la migración de
`cfn_matches` (ver lección anterior "La migración se aplicó a Supabase
pero no al Postgres local"). Esta vez fue al revés: el comando escribió a
local, y Supabase (lo que ve producción) se quedó sin los datos.

**Regla:** cuando el objetivo es que un dato llegue a producción, correr
el comando apuntando explícitamente a Supabase (`-e DATABASE_URL=...`), o
mejor todavía — usar el mecanismo que ya está armado para eso: el workflow
de GitHub Actions, que apunta a Supabase por diseño y no depende de
acordarse de un flag a mano cada vez. Esta lección es la razón de fondo
por la que vale la pena automatizar: un cron bien configurado no se
equivoca de base, una persona corriendo el comando a mano sí puede.
