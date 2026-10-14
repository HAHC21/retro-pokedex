"""Box scans. A failed read does not spend the allowance. A success does not write marks."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.db.user.box_scan_document import BoxScanDocument
from app.db.user.user_document import UserDocument
from tests.support import progress, sign_in


PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
GIF = b"GIF89a" + b"\x00" * 16


def _scan(client, *, content: bytes = PNG, mime: str = "image/png", source: str = "home", name: str = "box.png"):
    return client.post(
        "/api/scanner/box",
        data={"source": source},
        files={"image": (name, content, mime)},
    )


def _promote(user_id: str, role: str) -> None:
    UserDocument.objects(user_id=user_id).update(set__role=role)


def _backdate(user_id: str, days: int) -> None:
    UserDocument.objects(user_id=user_id).update(
        set__created_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    )


def test_a_new_account_gets_one_scan_and_a_failed_read_does_not_spend_it(world):
    """UC-SCN-11 and UC-SCN-05. The allowance is spent only when a review comes back."""
    client = world.client
    sign_in(client, "ash@example.com")
    quota = client.get("/api/scanner/quota")
    assert quota.status_code == 200, quota.text
    assert quota.json()["new_account"] is True
    assert quota.json()["allowance"] == 1
    assert quota.json()["remaining"] == 1
    assert quota.json()["exempt"] is False

    world.gemini.fail = True
    failed = _scan(client)
    assert failed.status_code == 502
    assert world.gemini.calls == 1
    assert client.get("/api/scanner/quota").json()["remaining"] == 1
    assert BoxScanDocument.objects.count() == 0

    empty = _scan(client, content=b"")
    assert empty.status_code == 502
    assert client.get("/api/scanner/quota").json()["remaining"] == 1

    world.gemini.fail = False
    before = progress(client)
    read = _scan(client)
    assert read.status_code == 200, read.text
    slots = read.json()["slots"]
    assert len(slots) == 30
    assert slots[0]["pokemon_id"] == 6
    assert slots[0]["identified"] is True
    assert progress(client) == before
    assert client.get("/api/scanner/quota").json()["remaining"] == 0

    blocked = _scan(client)
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "scan_limit"
    assert client.get("/api/scanner/quota").json()["remaining"] == 0


def test_after_two_days_the_allowance_is_two_per_day(world):
    """UC-SCN-12. Once the account is older than 48 hours, two scans are allowed in a day and the third waits."""
    client = world.client
    signed = sign_in(client, "ash@example.com")
    user_id = client.get("/api/auth/me").json()["id"]
    assert signed
    _backdate(user_id, days=3)

    quota = client.get("/api/scanner/quota").json()
    assert quota["new_account"] is False
    assert quota["allowance"] == 2
    assert quota["remaining"] == 2

    assert _scan(client).status_code == 200
    assert _scan(client).status_code == 200
    third = _scan(client)
    assert third.status_code == 429
    assert third.json()["detail"]["code"] == "scan_limit"
    assert client.get("/api/scanner/quota").json()["remaining"] == 0


def test_gif_and_bank_are_accepted_and_a_non_image_is_not(world):
    """UC-SCN-02 and UC-SCN-03. GIF counts. Pokémon Bank is a source. A text file is refused before a scan is spent."""
    client = world.client
    sign_in(client, "ash@example.com")
    text = _scan(client, content=b"not a picture", mime="text/plain", name="notes.txt")
    assert text.status_code == 400
    assert world.gemini.calls == 0
    assert client.get("/api/scanner/quota").json()["remaining"] == 1

    unknown = _scan(client, source="gameboy")
    assert unknown.status_code == 400
    assert world.gemini.calls == 0

    gif = _scan(client, content=GIF, mime="image/gif", name="box.gif")
    assert gif.status_code == 200, gif.text
    bank = client.get("/api/scanner/quota")
    assert bank.status_code == 200
    # The new-account allowance is spent by the GIF, so Bank is checked on a fresh trainer.
    client.post("/api/auth/logout")
    sign_in(client, "misty@example.com")
    bank_shot = _scan(client, source="bank")
    assert bank_shot.status_code == 200, bank_shot.text


def test_the_shared_budget_blocks_a_trainer_and_not_staff(world):
    """UC-SCN-13 and UC-STF-03. One dollar of scans today stops a trainer. Admin and developer are exempt, including from the personal cap."""
    BoxScanDocument(
        scan_id="spent",
        user_id="someone-else",
        scanned_at=datetime.now(timezone.utc).replace(tzinfo=None),
        cost_usd=1.0,
    ).save()

    client = world.client
    sign_in(client, "ash@example.com")
    blocked = _scan(client)
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "global_budget"
    assert world.gemini.calls == 0
    assert client.get("/api/scanner/quota").json()["remaining"] == 1
    assert client.get("/api/scanner/quota").json()["global_limit_reached"] is True

    for role, email in (("admin", "admin@example.com"), ("developer", "dev@example.com")):
        world.gemini.calls = 0
        client.post("/api/auth/logout")
        sign_in(client, email)
        user_id = client.get("/api/auth/me").json()["id"]
        _promote(user_id, role)
        for _ in range(3):
            response = _scan(client)
            assert response.status_code == 200, response.text
        assert world.gemini.calls == 3
        quota = client.get("/api/scanner/quota").json()
        assert quota["exempt"] is True
        assert quota["global_limit_reached"] is False
