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
- [x] Seed inicial de staff (BF, Chubi, Sirxtias, Drachen, Zacen) con `is_staff = true`
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
- [ ] Placeholder de branding en `docs/assets/` mientras llega el manual de marca.
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
- [ ] Historial de partidas / win rate por rango de días (`SPECS.md §12.1`)
      — modelo y migración listos, extracción esperando dump de HTML real.
- [x] Reproductor y chat de Twitch embebidos (video en el home, panel de
      chat deslizable disponible en todo el sitio).
- [x] Links a Liquipedia para jugadores de la escena chilena con perfil
      competitivo propio.
- [x] Chips de comunidad (Twitch/Discord/7TV) en el navbar.
- [x] `/puntos`: molde visual (podio + tabla), sin mecánica real todavía —
      ver `SPECS.md §13`, requiere definir con el CEO/staff cómo se
      acumulan los puntos antes de implementar de verdad.

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

## Notas de proceso

- El orden de fases sigue la priorización directa del CEO: dashboard interno →
  calendario/brackets públicos → widget de interacción → rewards → overlay →
  integración profunda con Discord.
- Cualquier bullet que se descubra necesario a mitad de camino se agrega aquí
  antes de implementarlo, no después.
