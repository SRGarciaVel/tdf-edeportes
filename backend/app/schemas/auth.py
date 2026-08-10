from pydantic import BaseModel

from app.schemas.user import UserRead


class TwitchLoginResponse(BaseModel):
    authorize_url: str
    state: str


class TwitchCallbackRequest(BaseModel):
    code: str
    state: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
