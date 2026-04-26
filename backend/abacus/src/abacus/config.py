from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = Field(
        "postgresql+asyncpg://appuser:apppassword@postgres:5432/abacus_db",
        validation_alias="ABACUS_DATABASE_URL",
    )
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = Field(
        "http://localhost:5175",
        validation_alias="ABACUS_CORS_ORIGINS",
    )
    # Neon Auth (JWT/JWKS) — leave empty in local dev to bypass auth
    jwks_url: str = Field("", validation_alias="ABACUS_JWKS_URL")
    jwt_audience: str = Field("", validation_alias="ABACUS_JWT_AUDIENCE")
    # Finnhub — leave empty to disable stock search
    finnhub_api_key: str = Field("", validation_alias="ABACUS_FINNHUB_API_KEY")
    finnhub_base_url: str = Field(
        "https://finnhub.io/api/v1", validation_alias="ABACUS_FINNHUB_BASE_URL"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def auth_enabled(self) -> bool:
        return bool(self.jwks_url)


settings = Settings()  # type: ignore[call-arg]
