# lessons.md — lecciones aprendidas

> Se actualiza después de cualquier corrección del usuario durante el
> desarrollo. Formato: qué pasó, por qué, regla para no repetirlo.

## Vite + TypeScript: `import.meta.env` requiere tipos ambientales

**Qué pasó:** `tsc -b` falló con `Property 'env' does not exist on type 'ImportMeta'`
al usar `import.meta.env.VITE_API_URL` en `src/lib/api.ts`.

**Por qué:** TypeScript no conoce las variables inyectadas por Vite a menos
que el proyecto declare explícitamente los tipos del cliente de Vite.

**Regla:** todo proyecto Vite + TS de este repo debe incluir
`src/vite-env.d.ts` con `/// <reference types="vite/client" />` desde el
bootstrap, antes de escribir el primer `import.meta.env.*`.

## Comandos multilínea con \ se rompen al pegar de Windows a WSL2

**Qué pasó:** un curl con continuación de línea (\ al final, headers en
líneas separadas) se ejecutó como varios comandos sueltos — curl -X POST ...
sin headers ni body, seguido de "-H: command not found" y "-d: command not found".
El endpoint respondió 403 porque nunca recibió el token, no porque el código
esté mal.

**Por qué:** al copiar texto multilínea hacia bash en WSL2, a veces se cuela
un \r al final de la línea con el \. Bash ve \<CR><LF> en vez de \<LF>, así
que la continuación de línea no se interpreta y cada línea corre como
comando independiente.

**Regla:** cualquier comando con headers/flags en líneas separadas con \, se
entrega como un solo comando en una línea, sin continuaciones. Más verboso
de leer, pero cero riesgo de que el pegado lo rompa.

## docker compose restart no relee cambios en .env

**Qué pasó:** se agregaron TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET al .env
después de que el contenedor backend ya existía. Todos los
docker compose restart backend posteriores siguieron corriendo con esas
variables vacías — Twitch devolvió {"status":400,"message":"missing client id"}
al armar la authorize_url con client_id= vacío.

**Por qué:** las variables de env_file se inyectan al contenedor en el
momento en que se crea (up), no en cada restart. restart reinicia el
proceso del contenedor existente tal cual estaba, sin releer el .env.

**Regla:** después de cualquier cambio en .env, usar
docker compose up -d --force-recreate <servicio> (o up -d a secas si
Compose detecta el cambio de config), nunca restart, para que las
variables nuevas lleguen al contenedor.
