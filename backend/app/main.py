from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, cfn, events, goals, health
from app.core.config import settings

app = FastAPI(title="TDF e-deportes API")

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
