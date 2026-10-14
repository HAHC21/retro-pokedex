"""Sign-in helpers. They use the HTTP API, not a shortcut around confirmation."""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient


PASSWORD = "correct-horse"


def token_from_url(url: str) -> str:
    query = parse_qs(urlparse(url).query)
    for key in ("token", "reset_token"):
        if key in query and query[key]:
            return query[key][0]
    raise AssertionError(f"no token in {url}")


def register(client: TestClient, email: str, password: str = PASSWORD, name: str = "Ash"):
    return client.post("/api/auth/register", json={"email": email, "password": password, "name": name})


def confirm(client: TestClient, url: str):
    return client.get("/api/auth/confirm", params={"token": token_from_url(url)}, follow_redirects=False)


def login(client: TestClient, email: str, password: str = PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def sign_in(client: TestClient, email: str, password: str = PASSWORD):
    """Create a confirmed account and leave its session on this client."""
    created = register(client, email, password)
    assert created.status_code == 200, created.text
    url = created.json()["confirm_url"]
    assert url
    confirmed = confirm(client, url)
    assert confirmed.status_code == 302
    assert "signed_in=1" in confirmed.headers["location"]
    return created.json()


def progress(client: TestClient) -> dict:
    response = client.get("/api/collection/progress")
    assert response.status_code == 200, response.text
    return response.json()["progress"]


def mark(tree: dict, game: str, key: str) -> dict:
    return (tree.get(game) or {}).get(key) or {}
