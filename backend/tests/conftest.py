"""API tests against the real services.

MongoDB is mongomock. Mail and Gemini are fakes. Auth, marks, specimens, and
scan limits still run the application code, so a wrong rule fails the test.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from mongoengine import connect, disconnect
from mongomock import MongoClient

from app.dependencies import get_auth_service, get_gemini_client, get_login_event_repository, get_user_repository
from app.integrations.gemini.client import GeminiImageResult, GeminiUsage
from app.main import create_app
from app.services.auth.service import AuthService


class CaptureMailer:
    def __init__(self) -> None:
        self.sent: list[dict[str, str]] = []

    async def send(self, *, to: str, subject: str, text: str, html: str | None = None) -> None:
        self.sent.append({"to": to, "subject": subject, "text": text, "html": html or ""})


class FakeGemini:
    def __init__(self) -> None:
        self.available = True
        self.fail = False
        self.calls = 0

    async def analyze_image(self, *, prompt: str, image: bytes, mime_type: str) -> GeminiImageResult:
        self.calls += 1
        if self.fail:
            raise RuntimeError("could not read the picture")
        return GeminiImageResult(
            data={
                "slots": [
                    {"slot": 1, "empty": False, "pokemon_id": 6, "name": "Charizard", "form": None, "shiny": False},
                ]
            },
            usage=GeminiUsage(prompt_tokens=10, candidates_tokens=20, thoughts_tokens=0, total_tokens=30),
            model="fake-scan",
        )

    async def aclose(self) -> None:
        return None


def _connect_memory() -> None:
    try:
        disconnect(alias="default")
    except Exception:
        pass
    connect(
        "pokedex-test",
        alias="default",
        host="mongodb://localhost",
        mongo_client_class=MongoClient,
        uuidRepresentation="standard",
    )


@pytest.fixture
def world(monkeypatch: pytest.MonkeyPatch):
    _connect_memory()
    monkeypatch.setattr("app.main.connect_mongo", lambda: None)
    monkeypatch.setattr("app.main.disconnect_mongo", lambda: None)
    monkeypatch.setattr("app.main.uses_outbound_email", lambda: False)
    # The developer .env may send real mail. Tests start with the link in the response.
    monkeypatch.setattr("app.services.auth.service.uses_outbound_email", lambda: False)
    mailer = CaptureMailer()
    gemini = FakeGemini()
    application = create_app()

    def auth_service() -> AuthService:
        return AuthService(get_user_repository(), mailer, get_login_event_repository())

    application.dependency_overrides[get_auth_service] = auth_service
    application.dependency_overrides[get_gemini_client] = lambda: gemini
    with TestClient(application) as client:
        yield SimpleNamespace(client=client, app=application, mailer=mailer, gemini=gemini)
    application.dependency_overrides.clear()
    try:
        disconnect(alias="default")
    except Exception:
        pass
