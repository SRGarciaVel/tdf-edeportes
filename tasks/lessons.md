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
