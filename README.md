# TDF e-deportes — Plataforma de Organización y Comunidad

Plataforma web del club de esports **TDF e-deportes**, enfocada en juegos de
pelea (Street Fighter 6, Third Strike, entre otros). Cubre tanto la
organización interna del staff (calendario, roles, moderación) como la cara
pública para la comunidad (perfiles de jugadores, contenido, herramientas
colaborativas).

Para el detalle funcional completo — qué hace cada sección, quién puede
hacer qué, reglas de negocio, flujos y glosario — ver
[`DOCUMENTACION.md`](./DOCUMENTACION.md). Este archivo es la puerta de
entrada técnica: cómo correr el proyecto y de qué está hecho.

## Qué hace hoy

- **Autenticación con Twitch OAuth** — único método de login, sin
  contraseñas propias.
- **Roster de Jugadores** — datos reales de Street Fighter 6 (rango, LP,
  personaje, estadísticas), obtenidos por scraping automatizado del perfil
  oficial de Capcom.
- **Perfil de jugador completo** — bio, nombre, avatar y banner
  personalizables (con soporte de GIF animado), redes sociales, radar de
  habilidades, editor de recorte/zoom para el banner.
- **Comentarios de perfil** y **sistema de notificaciones** (extensible a
  más tipos a futuro).
- **Calendario** del club, con vista pública y de gestión para staff.
- **Tier List** de la comunidad (100% basada en plantillas subidas por
  usuarios, sin roster de personajes propio por consideración de derechos
  de autor).
- **Hub de Street Fighter 6** — meta de personajes actual y notas de
  parche, con datos reales de Capcom.
- **Recopilaciones de Instagram** curadas por staff, con embed oficial de
  Meta.
- **FODA de la comunidad** — herramienta colaborativa de análisis, pública
  o privada, con o sin cuenta.
- **Panel de Administración** — nivel de acceso superior a Staff, gestión
  de roles y de la cuenta de Staff, dashboard técnico del sitio.
- **Streams destacados y chat multicanal** en el inicio.
- Objetivos trimestrales, página de Torneos, "Nosotros".

Lo que todavía es solo maqueta visual sin mecánica real: **Puntos** y
**Achievements**. El **hub de Third Strike** está parado por una
restricción de acceso automatizado de la fuente de datos externa (ver
`ROADMAP.md`).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT |
| Frontend | React + Vite + TypeScript, Tailwind CSS, Framer Motion |
| Obtención de datos externos | Playwright (scraping de perfil de Capcom), automatizado por GitHub Actions |
| Infra local | Docker + docker-compose |
| Base de datos (producción) | Supabase (PostgreSQL) |
| Hosting (producción) | Render (backend) + Vercel (frontend) |
| Auth | Twitch OAuth (Authorization Code flow) |

## Estructura del proyecto

```
tdf-edeportes/
├── SPECS.md                # especificación técnica de cada fase
├── README.md                # este archivo
├── DOCUMENTACION.md          # documentación funcional completa (roles, features, reglas de negocio)
├── CODESTYLE.md              # reglas de estilo de código
├── ROADMAP.md                # hoja de ruta del proyecto
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── api/              # routers FastAPI (uno por dominio: cfn, comments,
│   │   │                       notifications, highlights, admin, foda, events, etc.)
│   │   ├── core/              # config, seguridad, dependencias, rate limiter
│   │   ├── models/            # modelos SQLAlchemy
│   │   ├── schemas/           # schemas Pydantic
│   │   └── services/          # lógica de negocio (Twitch OAuth, scraping de Capcom, Discord)
│   ├── alembic/               # migraciones
│   └── scripts/               # scripts de refresco de datos (CFN, meta de SF6)
├── frontend/
│   └── src/
│       ├── components/        # piezas reusables (cards, embeds, editores)
│       ├── pages/              # una página por ruta
│       └── lib/                 # API client, hooks, tipos, helpers (sin carpeta hooks/ separada)
├── docs/
│   └── assets/                 # branding
└── tasks/
    └── lessons.md               # lecciones aprendidas del proyecto
```

## Cómo correrlo (local)

```bash
git clone <repo-url> tdf-edeportes
cd tdf-edeportes
cp .env.example .env          # completar TWITCH_CLIENT_ID, etc.
docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- Docs de la API (Swagger): `http://localhost:8000/docs` (deshabilitado en
  producción)

Al agregar una migración nueva, correrla en local **y** contra la base de
Supabase de producción por separado — ver `ROADMAP.md` y `SPECS.md` para el
comando exacto, no asumir que uno cubre al otro.

## Variables de entorno mínimas

Backend (`backend/.env` o variables de entorno de Render):

```
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI=
JWT_SECRET=
DATABASE_URL=
DISCORD_WEBHOOK_URL=
CORS_ORIGINS=
ENVIRONMENT=              # "production" activa validaciones de arranque adicionales
```

Frontend (`frontend/.env` o variables de entorno de Vercel):

```
VITE_API_URL=
```

## Documentación

- [`DOCUMENTACION.md`](./DOCUMENTACION.md) — funcionalidades, roles y
  permisos, flujos, reglas de negocio, glosario. Punto de partida para
  cualquier persona nueva en el proyecto, técnica o no.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — cómo trabajar en el código:
  entorno local, flujo de Git, convenciones de frontend, y la regla de
  idioma (tuteo chileno, nunca voseo).
- [`SPECS.md`](./SPECS.md) — especificación técnica por fase.
- [`CODESTYLE.md`](./CODESTYLE.md) — convenciones de código.
- [`ROADMAP.md`](./ROADMAP.md) — estado de avance y prioridades acordadas
  con el CEO del club.
