import logging

import httpx

from app.core.config import settings
from app.models import Event

logger = logging.getLogger(__name__)


def notify_event_change(event: Event, action: str) -> None:
    """Dispara un webhook a Discord al crear/modificar un evento.

    Sin cola de tareas ni reintentos (SPECS.md §8) — si Discord está caído,
    se loguea y se sigue; no hay volumen todavía que justifique más que eso.
    """
    if not settings.discord_webhook_url:
        logger.info("DISCORD_WEBHOOK_URL no configurado, se omite notificación")
        return

    content = f"📅 Evento {action}: **{event.title}** ({event.type}) — {event.start_at:%d/%m/%Y %H:%M}"
    try:
        httpx.post(settings.discord_webhook_url, json={"content": content}, timeout=5)
    except httpx.HTTPError as exc:
        logger.warning("Fallo al notificar a Discord: %s", exc)
