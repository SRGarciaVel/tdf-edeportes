from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://tdf:tdf@db:5432/tdf_edeportes"
    jwt_secret: str = "change_me"
    jwt_expiration_minutes: int = 1440

    twitch_client_id: str = ""
    twitch_client_secret: str = ""
    twitch_redirect_uri: str = "http://localhost:5173/auth/callback"

    discord_webhook_url: str = ""

    cors_origins: list[str] = ["http://localhost:5173"]


# instancia única reutilizada como dependencia en toda la app
settings = Settings()
