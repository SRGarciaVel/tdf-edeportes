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
