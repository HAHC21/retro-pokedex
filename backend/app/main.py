import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.public_urls import is_loopback_origin
from app.core.version import backend_version
from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import shutdown_external_clients
from app.integrations.email.sender import uses_outbound_email

logger = logging.getLogger("pokedex")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if uses_outbound_email() and (
        is_loopback_origin(settings.frontend_origin)
        or is_loopback_origin(settings.auth_redirect_base_url)
    ):
        logger.warning(
            "EMAIL_DELIVERY is active but FRONTEND_ORIGIN (%s) or AUTH_REDIRECT_BASE_URL (%s) "
            "is still localhost. Set both to public HTTPS origins on the api component, or email "
            "links will fall back to the request Host when possible.",
            settings.frontend_origin,
            settings.auth_redirect_base_url,
        )
    connect_mongo()
    try:
        yield
    finally:
        await shutdown_external_clients()
        disconnect_mongo()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    # App Platform (and similar) terminate TLS; honor X-Forwarded-* for public URLs.
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.secret_key,
        session_cookie="pokedex_session",
        same_site="lax",
        https_only=False,
        max_age=settings.session_max_age_seconds,
    )
    app.include_router(api_router, prefix=settings.api_prefix)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get(f"{settings.api_prefix}/version")
    def version(response: Response) -> dict[str, str]:
        response.headers["Cache-Control"] = "no-store"
        return {"version": backend_version()}

    return app


app = create_app()
