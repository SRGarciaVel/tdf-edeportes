import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfileCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=500)


class CommentAuthor(BaseModel):
    """Datos de quién escribió el comentario — de la cuenta de Twitch
    real (User), no de una fila de cfn_registrations: quien comenta
    puede no estar en el roster en absoluto (decisión de Seba,
    29-08-2026)."""

    user_id: uuid.UUID
    display_name: str
    avatar_url: str | None


class ProfileCommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cfn_id: str
    body: str
    created_at: datetime
    author: CommentAuthor
    # true si quien pide la lista puede borrar ESTE comentario puntual
    # (autor, dueño del perfil, o staff) — resuelto en el backend para
    # no duplicar esa lógica de permisos en el frontend
    can_delete: bool


class RecentCommentEntry(BaseModel):
    """Un comentario para la sección de "Actividad reciente" del Home
    (pedido de Seba, 29-08-2026) — a diferencia de ProfileCommentRead,
    trae DE QUIÉN es el perfil comentado (no solo el cfn_id crudo, hace
    falta el nombre para el texto "X comentó en el perfil de Y"), y
    nunca can_delete: nadie borra un comentario ajeno desde el Home,
    para eso hay que entrar al perfil real."""

    id: uuid.UUID
    body: str
    created_at: datetime
    author: CommentAuthor
    profile_cfn_id: str
    profile_display_name: str
