import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# solo posts/reels/IGTV públicos de instagram.com — mismo criterio que
# el resto del proyecto (ver PROFILE_IMAGE_DATA_URL_RE en schemas/cfn.py):
# validar el FORMATO real, no aceptar cualquier string. Sin esto,
# staff podría pegar sin querer un link a cualquier otro sitio y el
# embed de Instagram simplemente no funcionaría — mejor avisar al
# toque con un 422 claro que guardar un link roto silenciosamente.
INSTAGRAM_POST_URL_RE = re.compile(
    r"^https://(www\.)?instagram\.com/(p|reel|tv)/[A-Za-z0-9_-]+/?"
)


class HighlightCreate(BaseModel):
    url: str = Field(max_length=500)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not INSTAGRAM_POST_URL_RE.match(v):
            raise ValueError(
                "Tiene que ser un link a un post/reel de instagram.com "
                "(ej. https://www.instagram.com/p/XXXX/)"
            )
        return v


class HighlightRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    created_at: datetime
