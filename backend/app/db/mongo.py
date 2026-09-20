from mongoengine import disconnect, connect

from app.core.config import settings


def connect_mongo() -> None:
    if not settings.mongodb_uri.strip():
        raise RuntimeError(
            "MONGODB_URI is not set. Copy it from atlas-credentials.env into backend/.env "
            "(include /pokedex and Atlas query params)."
        )
    connect(host=settings.mongodb_uri, alias="default")


def disconnect_mongo() -> None:
    disconnect(alias="default")
