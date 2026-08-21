# ROADMAP.md — TDF e-deportes

Hoja de ruta derivada de `SPECS.md` y de la priorización acordada con el CEO.
Cada checkpoint marcado como completado debe tener un commit correspondiente
(`tipo: descripción`) — ver `CODESTYLE.md`.

## Corto plazo — Fase 1: Dashboard interno

**Objetivo:** staff con un solo lugar para organizar el itinerario del club.

- [x] Bootstrap del proyecto: `docker-compose.yml`, esqueleto backend (FastAPI)
      y frontend (Vite + React + Tailwind), `.env.example`.
- [x] Modelo de datos y migraciones Alembic: `users`, `roles`, `user_roles`,
      `events`, `event_comments`, `quarterly_goals`.
- [x] Auth: registro de app en Twitch Developer Console (Client ID/Secret ya
      cargados en `.env` por Seba).
- [x] Auth: flujo Twitch OAuth completo (`GET /auth/twitch/login`,
      `POST /auth/twitch/callback`, `GET /auth/me`, `POST /auth/logout`).
- [x] Seed inicial de staff (BazthyFreeman, Chubi, Sirxtias, Drachen, Zacen) con `is_staff = true`
      y sus roles asignados.
- [x] CRUD de eventos (`torneo`, `stream`, `reunion`, `otro`) con `visibility`.
- [x] Comentarios por evento.
- [x] Auth JWT propio: dependencias `get_current_user` / `require_staff`
      (el flujo de Twitch OAuth que las alimenta es el siguiente bullet).
- [x] Login con Twitch en el frontend (`AuthProvider`, botón de login,
      página de callback).
- [x] Vista de calendario en frontend (staff, con edición).
- [x] Vista pública de solo lectura: calendario + objetivos trimestrales.
- [x] CRUD de `quarterly_goals` (backend completo: GET/POST/PATCH/DELETE;
      frontend solo lectura por ahora — sin UI de gestión para el staff,
      ver nota en `tasks/todo.md`).
- [ ] Webhook saliente a Discord al crear/modificar evento.
- [x] Branding real recibido del diseñador (16-08-2026): logo completo
      (mascota + wordmark) y wordmark solo, con transparencia real. En uso
      en Navbar, Footer, Home (hero) y `/nosotros`. Favicon generado desde
      el mismo arte. Ver `SPECS.md §15` para el detalle de dónde vive cada
      archivo y qué falta decidir (cuál de las dos variantes del logo
      completo es la "oficial").
- [x] Deploy inicial (staging): Supabase (Postgres) + Render (backend) +
      Vercel (frontend). Ver `SPECS.md §14` para topología y URLs reales.
      Pendiente la "prueba end-to-end con al menos 2 miembros del staff
      real" — solo Seba lo probó hasta ahora.

## Fase 1.5 — Molde de sitio público

**Objetivo:** estructura visual completa del sitio (no solo el dashboard),
para tener un molde consistente donde seguir incorporando contenido real.

- [x] Dirección visual Tactical Telemetry (ver `SPECS.md §11`), tokens de
      Tailwind, tipografía (Rajdhani + JetBrains Mono).
- [x] Capa de acento street/graffiti sobre la base HUD: paneles con esquina
      cortada, glow en divisores, textura spray, marca splatter en el
      calendario, fuente de acento en wordmarks — aplicada vía componentes
      compartidos (`.hud-frame`, `SectionLabel`), así que se propaga sola a
      todas las páginas que ya los usan.
- [x] Layout compartido: `Navbar` + `Footer` en todas las páginas públicas.
- [x] Sitemap completo: `/`, `/calendario`, `/torneos`, `/jugadores`,
      `/objetivos`, `/nosotros` — con contenido real donde ya existe el
      backend (calendario, torneos con link a start.gg, objetivos) y
      placeholder prolijo donde falta (jugadores/CFN, nosotros).
- [x] CFN tracker real (`/jugadores`): implementado (Python + Playwright,
      ver `SPECS.md §12`) — pendiente que Seba lo corra por primera vez con
      sus credenciales reales, casi seguro necesita ajuste de selectores.
- [x] Historial de partidas / win rate por rango de días (`SPECS.md §12.1`)
      — COMPLETADO: extracción, guardado, endpoint de agregación y UI del
      filtro 1D/3D/7D en `/jugadores`, todo probado contra datos reales.
- [x] Reproductor y chat de Twitch embebidos (video en el home, panel de
      chat deslizable disponible en todo el sitio).
- [x] Links a Liquipedia para jugadores de la escena chilena con perfil
      competitivo propio.
- [x] Chips de comunidad (Twitch/Discord/7TV) en el navbar.
- [x] `/puntos`: molde visual (podio + tabla), sin mecánica real todavía —
      ver `SPECS.md §13`, requiere definir con el CEO/staff cómo se
      acumulan los puntos antes de implementar de verdad.
- [x] `/tierlist`: herramienta de tier lists para la comunidad, basada
      100% en plantillas subidas por la propia comunidad (no hay roster
      propio de SF6/Third Strike incorporado al sitio — decisión de
      copyright, ver `SPECS.md §16`). Crear una plantilla con imágenes
      requiere login con Twitch; ranquear una plantilla existente es
      libre para cualquiera. Tiers editables (agregar/sacar/reordenar/
      renombrar), drag and drop con reordenamiento real en cualquier
      dirección, exportar como PNG o al portapapeles, guardar y compartir
      por link. Ver `SPECS.md §16-18` para el historial completo
      (rediseños, bugs encontrados y resueltos).

## Mediano plazo — Fase 2: Cara pública y comunidad

**Objetivo:** todo lo que ve y usa la comunidad, no solo el staff.

- [ ] Calendario público enriquecido con link a brackets de start.gg por evento.
- [ ] Extensión/widget de interacción en tiempo real durante el stream
      (definir alcance técnico en un `SPECS.md` propio de esta fase).
- [ ] Diseño conjunto (CEO + staff) del sistema de puntos/rewards propio,
      independiente de Twitch Channel Points.
- [ ] Implementación de rewards: minijuegos tipo ranked de SF6, canjes con TTS,
      canjes de interacción con el stream (invertir controles, girar cámara, etc.).
- [ ] Evaluar integración con la API de start.gg para brackets en vivo (si el
      esfuerzo lo justifica frente a solo mostrar el link).

## Largo plazo — Fase 3: Identidad visual e integraciones profundas

**Objetivo:** pulir la experiencia audiovisual y cerrar integraciones que no
son bloqueantes para el uso diario del club.

- [ ] Overlay dinámico vía browser source conectado a la plataforma
      (a definir en conjunto con Chubi y Sirxtias — decisión de diseño pendiente).
- [ ] Actualización de identidad visual con el manual de marca oficial del club.
- [ ] Integración más profunda con Discord (más allá del webhook saliente):
      evaluar si vale la pena sincronizar roles o solo mantener anuncios.
- [ ] Explorar sustentabilidad económica del club (sponsors, donaciones) y,
      si corresponde, migrar de recursos gratuitos a infraestructura paga
      (hosting, dominio propio) — condicionado a que el club sea sustentable.

## Ideas paradas — Hub "SF6" en el Navbar (sin fecha, sin empezar)

**Origen:** conversación de diseño del 20-08-2026, a partir de explorar qué más
se puede sacarle a Buckler's Boot Camp además de lo que ya trackeamos. Seba
quiere un menú desplegable propio en el Navbar dedicado solo a Street
Fighter 6 (no a TDF como club), separado de `/jugadores`. Nada de esto
arranca hasta que se retome explícitamente — queda documentado para no
depender de que la conversación se acuerde sola.

- [ ] **Meta actual** — uso de personajes (`/stats/usagerate`) y diagrama de
      matchups/win rate entre personajes (`/stats/dia`), overall y también
      la versión filtrada solo a rango Master (`_master`, más relevante para
      preparación competitiva real que el promedio mezclado con todos los
      rangos). Datos globales de Capcom, no de TDF. Se actualiza una vez al
      mes (el segundo jueves).

      **Actualización 20-08-2026 — mucho más simple de lo previsto:**
      confirmado que existe una API JSON pública y real, sin sesión ni
      cookies, ni cualquier tipo de autenticación:
      `https://www.streetfighter.com/6/buckler/api/en/stats/usagerate/{yyyymm}`
      (ej. `.../202607` para julio 2026) — probado en vivo, trae
      `character_tool_name`, `character_alpha`, `play_rate` (el % que
      buscamos), `previous_rate` (mes anterior, sirve para mostrar
      tendencia), separado por `league_rank`/`league_alpha` (0=ALL,
      1=ROOKIE...8=MASTER) y por `operation_type` (0/1/2, probablemente
      All/Modern/Classic, sin confirmar el mapeo exacto todavía).

      Esto significa que Meta Actual **no necesita Playwright para nada**
      — a diferencia de todo lo demás que trackeamos, alcanza con una
      llamada HTTP simple, sin navegador, sin sesión compartida, sin
      cookies de Capcom. Mucho más liviano y confiable de mantener.

      Sin confirmar todavía (bloqueado por una limitación de herramienta
      de Claude, no algo que haga falta investigar de fondo): si
      `/api/en/stats/dia/{yyyymm}` (el diagrama de matchups) sigue el
      mismo patrón — muy probable dado que la URL de la página real usa
      exactamente `/stats/dia/{yyyymm}`, misma convención. Confirmar
      con un fetch directo la próxima vez que se retome.

      **Confirmación final, 21-08-2026:** Seba probó
      `/api/en/stats/dia/{yyyymm}` a mano y también responde limpio, sin
      sesión — **los dos endpoints de Meta Actual están 100% confirmados
      y listos para implementar**, sin ninguna duda técnica pendiente.
      Estructura del diagrama: por cada personaje, un `total`/`_win_rate`
      general y un array `values` con el resultado contra cada rival —
      `val` es un puntaje sobre 10 (5.0 = parejo, más alto = favorable),
      `thm` un indicador rápido -1/0/1 (probablemente para el color
      azul/naranja del gráfico real), y `"-.---"` cuando faltan
      partidas suficientes para ese matchup puntual.
- [ ] **Notas de parche** — análisis/resumen de los battle change list que
      Capcom publica (`streetfighter.com/6/buckler/battle_change`). Todavía
      sin definir el enfoque técnico (¿scraping y resumen automático?
      ¿alguien de staff lo redacta a mano con la info oficial como fuente?).
- [ ] **Estadísticas avanzadas por jugador de TDF** (Drive Impact, Perfect
      Parry, Punish Counters, Corner Pressure, etc.) — confirmado viable:
      viven en la pestaña "Stats" > "Results" de cada perfil
      (`/profile/{cfn_id}/play`), son promedios de Capcom sobre las últimas
      100 partidas (no hay que reconstruir nada partida por partida), y
      confirmado que SÍ son visibles en el perfil de otra persona estando
      logueado con una cuenta distinta (no son datos privados del dueño del
      perfil) — se puede scrapear con el mismo enfoque de sesión compartida
      de siempre. Categorías concretas ya identificadas de una captura real:
      "el que más Drive Impact se come", "mejor Perfect Parry de la
      comunidad", "el Drive Impact más letal" (mejor punish counter con DI),
      "el más agresivo" (tiempo acorralando rivales), "el mejor agarrador"
      (throws conectados). Esto podría vivir en `/jugadores` en vez del hub
      de SF6, ya que es específico de la gente de TDF — a definir cuando se
      retome.
- [ ] Espacio abierto para lo que vaya surgiendo — Seba mencionó "da para
      hartos usos" sin cerrar la lista todavía.

## Ideas paradas — Hub "Third Strike" (sin fecha, sin empezar)

**Origen:** Seba investigó fuentes de datos con Google AI Mode (20-08-2026)
para un hub similar al de SF6, pero para Third Strike — juego recurrente en
la comunidad, sin la infraestructura oficial tipo Buckler's Boot Camp que
tiene SF6. Antes de sumarlo, se verificaron las afirmaciones de esa
investigación (las respuestas de "modo IA" a veces inventan detalles
específicos que suenan reales pero no lo son) — acá quedó lo confirmado de
verdad, no lo que decía la IA de Google sin chequear.

- **Fightcade** — la plataforma donde vive la comunidad competitiva actual
  de Third Strike. Tiene una API pública real (`fightcade.com/api/`) y un
  wrapper de código abierto genuino, `fightcade-api` de xBiggs (confirmado
  en npm/GitHub/JSR, no inventado). El juego está trackeado bajo el ID
  `sfiii3n` — ojo que también existe `sfiii3nr1` (otra variante de ROM),
  hay que confirmar cuál juega la comunidad antes de asumir.
  **Bloqueante activo ahora mismo (confirmado en vivo el 20-08-2026):** la
  API pública de Fightcade está caída por cambios de Cloudflare — un sitio
  de terceros que la usa (fightcade.voidtalker.com) muestra el aviso en
  vivo. No es algo resuelto, es un bloqueo actual. Primer paso obligado al
  retomar esto: volver a probar si la API ya responde antes de construir
  nada arriba.
- **Start.gg** — API GraphQL real y bien documentada, pero para otra cosa:
  torneos/brackets/resultados de eventos, no estadísticas de jugadores.
  Complementario, no un reemplazo de Fightcade.
- **Sin verificar todavía, no confiar sin chequear más:** un repo llamado
  "3rd_training_lua" para frame data, y DIAMBRA AI (plataforma de
  entrenamiento de IA para jugar el juego, no pensada como fuente de datos
  para un sitio — el fit que sugirió la IA de Google parece forzado, hay
  que confirmarlo antes de darlo por bueno).

## Notas de proceso

- El orden de fases sigue la priorización directa del CEO: dashboard interno →
  calendario/brackets públicos → widget de interacción → rewards → overlay →
  integración profunda con Discord.
- Cualquier bullet que se descubra necesario a mitad de camino se agrega aquí
  antes de implementarlo, no después.
