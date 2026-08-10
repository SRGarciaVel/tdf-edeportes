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
