from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Pokedex API"
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:5173"]
    collection_data_path: str = "data/collection.json"
    pokeapi_base_url: str = "https://pokeapi.co/api/v2/"
    pokeapi_user_agent: str = "pokedex/0.1 (educational; pokeapi.co)"
    pokeapi_cache_ttl_seconds: int = 60 * 60 * 24 * 30  # ~1 month; species data rarely changes
    mongodb_uri: str = ""
    secret_key: str = "dev-change-me"
    frontend_origin: str = "http://localhost:5173"
    auth_redirect_base_url: str = "http://localhost:5173"
    session_max_age_seconds: int = 60 * 60 * 24 * 14
    google_client_id: str = ""
    google_client_secret: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_tenant: str = "common"
    # console = free (log + optional confirm_url in API). resend = free-tier transactional email.
    email_delivery: str = "console"
    resend_api_key: str = ""
    email_from: str = "Pokédex <onboarding@resend.dev>"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
