# todo.md — tarea activa

> Se reescribe al empezar cada tarea no trivial. El historial de tareas
> completadas vive en los commits y en `ROADMAP.md`, no acá.

## Tarea actual

Extracción de historial de partidas — COMPLETADA Y CONFIRMADA EN VIVO
(80 partidas reales guardadas sin error).

## Qué se hizo (resumen del camino completo)

1. Modelo `CFNMatch` + migración `cfn_matches` — verificado local.
2. Primer intento de click en la pestaña "History" → falló por banner de
   cookies interceptando clicks.
3. Segundo intento (aceptando cookies + force=True) → el click "funcionaba"
   pero clickeaba el "History" equivocado (mismo nombre de clase CSS
   reusado en un menú del header, no en el tab del perfil).
4. Se encontró que la pestaña es en realidad un link real
   (`/profile/{cfn_id}/battlelog`) — se descartó el click por completo,
   se navega directo.
5. Con el HTML real de esa página, se escribió `get_match_history()` en
   `cfn_scraper.py` — selectores exactos (fecha, rival, resultado por
   clase CSS win/lose, personaje por atributo `alt` de imagen).
6. `refresh_all_players()` ahora devuelve (perfiles, partidas) — una sola
   sesión de navegador para ambos, no se duplica el costo de login.
7. `refresh_cfn.py` guarda las partidas nuevas, saltea las repetidas
   (mismo `cfn_id` + `played_at` + `opponent_name` = ya vista).
8. Se eliminó `scripts/debug_cfn_history.py` y `dump_match_history_debug`
   — ya cumplieron su función, dejarlos hubiera sido código muerto.

## Verificación real hecha

- [x] Extracción probada con `lxml`/`cssselect` contra el HTML real de 10
      partidas — los 10 resultados (fecha, WIN/LOSE, rival, personaje)
      coinciden exactamente con la captura de pantalla de Seba, incluido
      el cambio de personaje Jamie→Yasmine a mitad de sesión.
- [x] `refresh_cfn.py` completo probado contra Postgres real con esos 10
      partidos reales (mockeando solo el scraping en sí, no la lógica de
      guardado): primera corrida guarda 10, segunda corrida detecta las
      10 como ya vistas y no duplica — conteos de wins/loses/personajes
      verificados exactos.

## PENDIENTE — requiere que Seba lo corra en su entorno real

```
docker compose exec backend python scripts/refresh_cfn.py
```

Esta va a ser la primera corrida real de `get_match_history` contra el
sitio en vivo (antes solo probamos con el HTML ya capturado). Si falla,
mandar el error — puede que haya algo distinto entre el HTML estático que
tengo y lo que carga en vivo (aunque no debería, ya que navegar directo a
la URL es mucho más simple que lo que fallaba antes).

Confirmar en la base:
```
docker compose exec db psql -U tdf -d tdf_edeportes -c "SELECT cfn_id, count(*) FROM cfn_matches GROUP BY cfn_id;"
```

## Siguiente tarea

Con las partidas ya guardándose solas cada hora, **confirmado en
producción-local** (80 partidas reales, 0 errores, deduplicación
funcionando): el endpoint de agregación
(`GET /cfn/players/{id}/matches?days=N`) y la UI del filtro de días en
`/jugadores` — quedan para la próxima sesión.

## Checklist de verificación antes de marcar como completa

- [ ] Corre localmente sin errores (`docker compose up`)
- [ ] Tests relevantes pasan (si aplica)
- [ ] Formateado (`ruff format` / `prettier`) antes de commit
- [ ] Commit hecho con conventional commit
- [ ] Bullet correspondiente tildado en `ROADMAP.md`
