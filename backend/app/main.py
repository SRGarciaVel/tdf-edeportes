from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import (
    admin,
    auth,
    cfn,
    comments,
    events,
    goals,
    health,
    highlights,
    notifications,
    sf6,
    tier_lists,
    twitch,
    users,
)
from app.core.config import settings
from app.core.limiter import limiter

# informe de seguridad 18-08-2026, hallazgo #2: /docs, /redoc y
# /openapi.json quedan abiertos en producción hoy, lo que le facilita a
# cualquiera mapear toda la API. Se deshabilitan solo quando
# ENVIRONMENT=production (variable de entorno en Render) — en local
# siguen disponibles, no hace falta tocar nada del flujo de desarrollo.
is_production = settings.environment == "production"

# auditoría de seguridad 29-08-2026: JWT_SECRET tiene "change_me" como
# default en config.py (necesario para que el proyecto arranque sin
# .env en desarrollo) — si esa variable de entorno nunca se configura
# en Render por error humano, cualquiera podría FIRMAR sus propios
# tokens de sesión (ese string es público, está en este mismo repo).
# Falla el arranque en vez de correr silenciosamente insegura — mejor
# que Render marque el deploy como roto a que la API funcione mal.
if is_production and settings.jwt_secret == "change_me":
    raise RuntimeError(
        "JWT_SECRET sigue en su valor por default en producción — "
        "configura la variable de entorno real en Render antes de desplegar."
    )

app = FastAPI(
    title="TDF e-deportes API",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(goals.router)
app.include_router(cfn.router)
app.include_router(comments.router)
app.include_router(notifications.router)
app.include_router(highlights.router)
app.include_router(admin.router)
app.include_router(tier_lists.router)
app.include_router(users.router)
app.include_router(sf6.router)
app.include_router(twitch.router)


@app.get("/")
def root() -> dict[str, str]:
    # sin esto, algunos chequeos automáticos (ej. el health check por
    # defecto de Render, que pega a "/" salvo que se configure otra ruta)
    # ven el 404 de una API sin endpoint raíz y asumen que el servicio
    # está caído, aunque /health esté perfecto
    return {"status": "ok"}
