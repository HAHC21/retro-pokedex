from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Browser origins that call the production API at https://api.retropokedex.com.
PRODUCTION_SITE_ORIGINS = (
    "https://www.retropokedex.com",
    "https://retropokedex.com",
)


class Settings(BaseSettings):
    app_name: str = "Pokedex API"
    api_prefix: str = "/api"
    # Release id for open tabs. APP_VERSION wins; COMMIT_HASH is the App Platform fallback.
    app_version: str = ""
    commit_hash: str = ""
    cors_origins: list[str] = ["http://localhost:5173"]
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
    # console = log + confirm_url in API. resend = Resend HTTP API. smtp = STARTTLS relay.
    email_delivery: str = "console"
    resend_api_key: str = ""
    email_from: str = "Pokédex <noreply@retropokedex.com>"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    # Comma-separated emails elevated on login/register (never auto-demotes).
    admin_emails: str = ""
    developer_emails: str = ""
    # Smogon competitive sets (data.pkmn.cc) + optional Gemini AI suggestions.
    smogon_sets_base_url: str = "https://data.pkmn.cc/sets"
    smogon_cache_ttl_seconds: int = 60 * 60 * 24 * 7
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    # Admin acquisition. Service account JSON (one line) or a path to the key file.
    # Invite that account on the GA4 property, Search Console property, and Ads account.
    google_service_account_json: str = ""
    google_analytics_property_id: str = ""
    google_search_console_site_url: str = ""
    google_ads_customer_id: str = ""
    google_ads_developer_token: str = ""
    google_ads_login_customer_id: str = ""
    google_ads_api_version: str = "v25"
    # Gap filler. The API process does not read these; the Celery worker does.
    celery_broker_url: str = "redis://redis:6379/0"
    fill_gaps_interval_seconds: int = 900

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def allow_browser_origins(self) -> "Settings":
        frontend = self.frontend_origin.rstrip("/")
        self.cors_origins = list(
            dict.fromkeys(
                [
                    *self.cors_origins,
                    frontend,
                    "http://localhost:5173",
                    "http://localhost:5174",
                    *PRODUCTION_SITE_ORIGINS,
                ]
            )
        )
        return self


settings = Settings()
