# TDF e-deportes — Plataforma de Organización

Plataforma web para el club de esports **TDF e-deportes**, enfocada en juegos
de pelea (Street Fighter 6, Third Strike, Alpha 2, entre otros). Construida de
forma progresiva: primero organización interna del staff, luego funcionalidades
para la comunidad (calendario público, rewards, interacción en vivo).

## Qué hace (Fase 1)

- **Login con Twitch OAuth** — cualquier miembro del staff entra con su cuenta
  de Twitch, sin gestionar contraseñas propias.
- **Calendario del club** — torneos, streams y reuniones en una sola vista,
  editable por cualquier miembro del staff.
- **Comentarios por evento** — coordinación puntual sin depender de otro chat.
- **Vista pública** — cualquier visitante ve el calendario de eventos abiertos
  y los objetivos del club por trimestre, sin necesidad de cuenta.
- **Notificaciones a Discord** — cada evento nuevo o modificado se anuncia
  automáticamente en el servidor del club.

## Stack

| Capa       | Tecnología                                          |
|------------|------------------------------------------------------|
| Backend    | FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT         |
| Frontend   | React + Vite, TailwindCSS, Framer Motion              |
| Infra      | Docker + docker-compose                               |
| Auth       | Twitch OAuth (Authorization Code flow)                |

## Estructura del proyecto

```
tdf-edeportes/
├── SPECS.md              # especificación técnica de cada fase
├── README.md              # este archivo
├── CODESTYLE.md            # reglas de estilo de código
├── ROADMAP.md              # hoja de ruta del proyecto
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── api/            # routers FastAPI
│   │   ├── core/            # config, seguridad, dependencias
│   │   ├── models/           # modelos SQLAlchemy
│   │   ├── schemas/          # schemas Pydantic
│   │   └── services/          # lógica de negocio (Twitch OAuth, Discord webhook)
│   ├── alembic/              # migraciones
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── lib/
├── docs/
│   └── assets/              # branding placeholder
└── tasks/
    ├── todo.md               # checklist de trabajo activo
    └── lessons.md             # lecciones aprendidas del proyecto
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
- Docs de la API (Swagger): `http://localhost:8000/docs`

## Variables de entorno mínimas

```
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI=
JWT_SECRET=
DATABASE_URL=
DISCORD_WEBHOOK_URL=
```

## Roadmap

Ver `ROADMAP.md` para el orden de fases acordado con el CEO del club.
