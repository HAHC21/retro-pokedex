"""Staff tools. A normal trainer cannot use them. A bad file does not discard the good ones."""

from __future__ import annotations

from app.db.user.user_document import UserDocument
from app.dependencies import get_moveset_service
from tests.support import mark, progress, sign_in


def _staff(client, email: str, role: str = "admin") -> None:
    sign_in(client, email)
    user_id = client.get("/api/auth/me").json()["id"]
    UserDocument.objects(user_id=user_id).update(set__role=role)


def test_a_trainer_cannot_import_a_batch_or_refresh_gemini(world):
    """UC-STF-01 and UC-STF-02. Both routes refuse a normal account."""
    client = world.client
    sign_in(client, "ash@example.com")
    batch = client.post(
        "/api/collection/owned/from-pk-batch",
        json={"items": [{"pokemon_id": 6, "filename": "charizard.pk6"}]},
    )
    assert batch.status_code == 403
    refresh = client.post("/api/poke/pokemon/6/movesets/ai/refresh", params={"game": "sv"})
    assert refresh.status_code == 403
    assert progress(client) == {}


def test_a_batch_saves_a_repeated_file(world):
    """UC-STF-01. The same name and size is saved again. Each specimen adds its mark and leaves other saves alone."""
    client = world.client
    _staff(client, "admin@example.com")
    seeded = client.put(
        "/api/collection/progress",
        json={"mode": "replace", "progress": {"rb": {"6": {"caught": True, "caughtFemale": True}}}},
    )
    assert seeded.status_code == 200, seeded.text
    duplicate = client.post(
        "/api/collection/owned/from-pk-batch",
        json={
            "filename": "folder",
            "items": [
                {"pokemon_id": 6, "filename": "charizard.pk6", "size": 1200, "game_key": "sv"},
                {"pokemon_id": 6, "filename": "charizard.pk6", "size": 1200, "game_key": "sv"},
                {"pokemon_id": 25, "filename": "pikachu.pk6", "size": 800, "game_key": "sv"},
            ],
        },
    )
    assert duplicate.status_code == 201, duplicate.text
    assert duplicate.json()["saved"] == 3
    charizard = client.get("/api/collection/owned", params={"pokemon_id": 6}).json()["items"]
    pikachu = client.get("/api/collection/owned", params={"pokemon_id": 25}).json()["items"]
    assert len(charizard) == 2
    assert len(pikachu) == 1
    assert mark(progress(client), "rb", "6").get("caughtFemale") is True
    assert mark(progress(client), "sv", "6").get("caught") is True
    assert mark(progress(client), "sv", "25").get("caught") is True


def test_an_unreadable_batch_item_is_reported_and_the_others_are_saved(world):
    """UC-STF-01. One bad file does not discard the readable files in the same batch."""
    client = world.client
    _staff(client, "admin@example.com")
    mixed = client.post(
        "/api/collection/owned/from-pk-batch",
        json={
            "items": [
                {"pokemon_id": 133, "filename": "eevee.pk6", "size": 500, "game_key": "sv"},
                {"filename": "broken.pk6", "size": 10},
            ],
        },
    )
    assert mixed.status_code == 201, mixed.text
    assert mixed.json()["saved"] == 1
    assert mixed.json()["failed"] == 1
    eevee = client.get("/api/collection/owned", params={"pokemon_id": 133}).json()["items"]
    assert len(eevee) == 1
    assert mixed.json()["errors"][0]["filename"] == "broken.pk6"
    assert mark(progress(client), "sv", "133").get("caught") is True


class _Moves:
    def __init__(self, fail: bool) -> None:
        self.fail = fail
        self.calls: list[tuple[int, str, bool]] = []

    async def ai_movesets(self, pokemon_id: int, game: str, force: bool = False):
        self.calls.append((pokemon_id, game, force))
        if self.fail:
            raise RuntimeError("gemini down")
        return {
            "game": game,
            "pokemon_id": pokemon_id,
            "available": True,
            "provider": "fake",
            "message": None,
            "sets": [
                {
                    "name": "Sun",
                    "moves": ["Flamethrower", "Air Slash", "Dragon Dance", "Earthquake"],
                    "source": "ai",
                }
            ],
            "cached": False,
        }


def test_staff_refresh_replaces_the_sets_and_a_failure_is_an_error(world):
    """UC-STF-02. A successful refresh returns the new sets. A failure is an error, not an empty success."""
    client = world.client
    _staff(client, "admin@example.com")
    fresh = _Moves(fail=False)
    world.app.dependency_overrides[get_moveset_service] = lambda: fresh
    ok = client.post("/api/poke/pokemon/6/movesets/ai/refresh", params={"game": "sv"})
    assert ok.status_code == 200, ok.text
    assert ok.json()["sets"][0]["name"] == "Sun"
    assert fresh.calls == [(6, "sv", True)]

    broken = _Moves(fail=True)
    world.app.dependency_overrides[get_moveset_service] = lambda: broken
    failed = client.post("/api/poke/pokemon/6/movesets/ai/refresh", params={"game": "sv"})
    assert failed.status_code == 503
    assert "not available" in failed.json()["detail"].lower()
    assert failed.json().get("sets") in (None, [])
    assert "Sun" not in failed.text
