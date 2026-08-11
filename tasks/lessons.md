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
