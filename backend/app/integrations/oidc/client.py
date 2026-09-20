from authlib.integrations.starlette_client import OAuth

from app.core.config import Settings

GOOGLE = "google"
MICROSOFT = "microsoft"
PROVIDERS = (GOOGLE, MICROSOFT)


class OidcClientRegistry:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._oauth = OAuth()
        if self.is_configured(GOOGLE):
            self._oauth.register(
                name=GOOGLE,
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
                server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
                client_kwargs={"scope": "openid email profile"},
            )
        if self.is_configured(MICROSOFT):
            tenant = settings.microsoft_tenant or "common"
            self._oauth.register(
                name=MICROSOFT,
                client_id=settings.microsoft_client_id,
                client_secret=settings.microsoft_client_secret,
                server_metadata_url=f"https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration",
                client_kwargs={"scope": "openid email profile"},
            )

    def is_configured(self, provider: str) -> bool:
        if provider == GOOGLE:
            return bool(self._settings.google_client_id and self._settings.google_client_secret)
        if provider == MICROSOFT:
            return bool(self._settings.microsoft_client_id and self._settings.microsoft_client_secret)
        return False

    def enabled_providers(self) -> dict[str, bool]:
        return {name: self.is_configured(name) for name in PROVIDERS}

    def client(self, provider: str):
        if provider not in PROVIDERS:
            raise KeyError(provider)
        if not self.is_configured(provider):
            raise KeyError(provider)
        return getattr(self._oauth, provider)
