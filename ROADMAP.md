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

## Hub "SF6" en el Navbar

**Origen:** conversación de diseño del 20-08-2026, a partir de explorar qué más
se puede sacarle a Buckler's Boot Camp además de lo que ya trackeamos.

- [x] **Meta actual** (`/sf6/meta`) — uso de personajes y diagrama de
      matchups, overall y Solo Master, con toggle Modern/Classic. Datos
      globales de Capcom vía API JSON pública real, sin sesión ni Playwright
      (`GET .../api/en/stats/{usagerate,dia}{_master}/{yyyymm}`) — requiere
      headers de navegador (User-Agent/Referer) o Capcom devuelve 403.
      Cache mensual en `sf6_meta_snapshots` (JSONB), refrescado por
      `refresh-sf6-meta.yml` (GitHub Actions, días 9-11 de cada mes o a
      mano vía `workflow_dispatch`). Estructura de "Solo Master" es
      genuinamente distinta a la de "todos los rangos" (sin liga "ALL",
      sin rama "m"/Modern para matchups todavía confirmada) — Modern queda
      deshabilitado en Solo Master hasta confirmar esa rama. Verificado en
      producción con datos reales, 21-08-2026.
- [ ] **Notas de parche** — análisis/resumen de los battle change list que
      Capcom publica (`streetfighter.com/6/buckler/battle_change`). Todavía
      sin definir el enfoque técnico (¿scraping y resumen automático?
      ¿alguien de staff lo redacta a mano con la info oficial como fuente?).
- [x] **Records por jugador de TDF** (Drive Impact, Perfect Parry, Punish
      Counters, Corner Pressure, throws) — vive en `/jugadores`, no en el
      hub de SF6 (es específico de la gente de TDF, no del juego en
      general). Scrapeado de la pestaña Stats > Results de cada perfil,
      promedios de Capcom sobre las últimas 100 partidas. Verificado con
      datos reales en producción, 20-08-2026.
- [ ] Espacio abierto para lo que vaya surgiendo — Seba mencionó "da para
      hartos usos" sin cerrar la lista todavía.

## Rediseño del Navbar

**Origen:** conversación de diseño del 21-08-2026, a partir de sentir que el
navbar quedó recargado tras sumar el dropdown de SF6.

- [x] Barra doble: aviso (antes `AnnouncementBar` suelto solo en Home, ahora
      fusionado y visible en todo el sitio, sin botón de cerrar a propósito
      — un click sin querer lo perdía para siempre) + barra principal.
- [x] Logo flotante que atraviesa el borde entre ambas barras, con brillo
      real de marca (resplandor de fondo + drop-shadow directo sobre las
      letras).
- [x] Links reagrupados: Inicio/Calendario/Jugadores directos, Comunidad▾,
      SF6▾ (con caja/borde, distinto del estilo plano de Comunidad).
- [x] Búsqueda real (no simulada) sobre Jugadores/Torneos/Tier Lists/Páginas
      del sitio — filtrado 100% del lado del cliente, sin endpoint nuevo en
      el backend (la comunidad es chica, hubiera sido sobre-ingeniería).
- [x] Framer Motion + Lucide React sumados como dependencias (decisión de
      Seba, 21-08-2026) — animan los paneles desplegables, el drawer
      mobile, la línea bajo el link activo, y el palpitar del botón "Ver
      stream". Bundle creció ~40% (355KB → 494KB) por la librería, costo
      esperado y aceptado.
- [x] Anillo + glow en el avatar del usuario logueado.

## Pendiente de esta sesión, sin roadmap propio todavía

- [ ] **Hero de Home** — se armó y aprobó el teaser (mascota grande con
      resplandor de marca detrás, CTA "Ver stream"/"Ver calendario"), pero
      nunca se aplicó al código real de `HomePage.tsx`. El navbar se llevó
      el resto de la sesión.
- [ ] `npm audit`: 2 vulnerabilidades moderadas en `react-router-dom`
      (encontradas al instalar Framer Motion/Lucide, no relacionadas a
      esas dos) — sin resolver, `npm audit fix` debería alcanzar.

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
