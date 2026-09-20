from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import shutdown_external_clients


@asynccontextmanager
async def lifespan(_app: FastAPI):
    connect_mongo()
    try:
        yield
    finally:
        await shutdown_external_clients()
        disconnect_mongo()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
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

    return app


app = create_app()
