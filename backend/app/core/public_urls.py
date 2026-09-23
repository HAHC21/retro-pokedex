"""Resolve public origins for redirects and email links."""

from urllib.parse import urlparse

from starlette.requests import Request

from app.core.config import settings


def is_loopback_origin(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".localhost")


def request_api_base(request: Request) -> str:
    """Scheme + host of this API request (honors forwarded headers when enabled)."""
    return str(request.base_url).rstrip("/")


def request_frontend_origin(request: Request) -> str | None:
    """Browser Origin when the SPA called the API; otherwise None."""
    origin = (request.headers.get("origin") or "").strip().rstrip("/")
    if not origin:
        return None
    return origin


def auth_public_base(request: Request | None = None) -> str:
    """
    Base URL for OAuth callbacks and email confirmation links (`…/api/auth/...`).

    Prefer AUTH_REDIRECT_BASE_URL when it is a public host. If it is still
    localhost (misconfigured production), fall back to the request's public API
    origin so outbound mail does not contain localhost links.
    """
    configured = settings.auth_redirect_base_url.rstrip("/")
    if not is_loopback_origin(configured):
        return configured
    if request is not None:
        derived = request_api_base(request)
        if derived and not is_loopback_origin(derived):
            return derived
    return configured


def frontend_public_origin(request: Request | None = None) -> str:
    """
    Site origin for post-login redirects and password-reset email links.

    Prefer FRONTEND_ORIGIN when public; otherwise the request Origin header.
    """
    configured = settings.frontend_origin.rstrip("/")
    if not is_loopback_origin(configured):
        return configured
    if request is not None:
        derived = request_frontend_origin(request)
        if derived and not is_loopback_origin(derived):
            return derived
    return configured
