# AGENTS.md — Orden de trabajo obligatorio en este proyecto

Al iniciar cualquier sesión de desarrollo en este repo, seguir este orden:

1. Leer `./SPECS.md`, `README.md`, `CODESTYLE.md` y `ROADMAP.md`, en ese orden.
2. Completar los bullet points correspondientes en `ROADMAP.md` a medida que
   se avanza — no acumular trabajo sin reflejarlo ahí.
3. Commit en cada checkpoint significativo, no al final de la sesión.
   Conventional commits (`tipo: descripción`), hechos por CLI.
4. No abusar de comentarios ni de tokens — ver reglas de comentarios en
   `CODESTYLE.md`.
5. Formatear (`ruff format` en backend, `prettier` en frontend) antes de
   cada commit.

Metodología general del proyecto (aplica a cualquier tarea no trivial, 3+
pasos o decisión de arquitectura):

- Entrar en modo plan antes de construir. Si algo se tuerce, detenerse y
  volver a planificar — no seguir empujando sobre un plan que dejó de servir.
- Usar subagentes para investigación/análisis en paralelo cuando el problema
  lo amerite, para no saturar el contexto principal.
- Actualizar `tasks/lessons.md` después de cualquier corrección del usuario.
- Nunca marcar una tarea como completa sin demostrar que funciona
  (correr, probar, mostrar logs).
- Preferir la solución elegante sobre el parche rápido en cambios no
  triviales; saltarse esto en arreglos simples y obvios.
