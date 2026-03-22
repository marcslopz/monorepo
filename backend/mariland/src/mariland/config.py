from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://appuser:apppassword@postgres:5432/mariland_db"
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5174"
    anthropic_api_key: str = ""
    jina_api_key: str = ""
    scrapingbee_api_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
