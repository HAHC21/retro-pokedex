"""Caught and shiny marks. A specimen is not one of them."""

from __future__ import annotations

from tests.support import mark, progress, sign_in


CHARIZARD = "6"


def test_marks_are_per_save_and_a_failed_write_leaves_them(world):
    """UC-X-06, UC-X-11, UC-MRK-06. Scarlet and Sword are separate. A rejected save does not wipe the earlier one."""
    client = world.client
    sign_in(client, "ash@example.com")
    written = client.put(
        "/api/collection/progress",
        json={
            "mode": "merge",
            "progress": {
                "sv": {CHARIZARD: {"caught": True, "caughtMale": True, "shiny": False}},
                "swsh": {CHARIZARD: {"caught": False, "shiny": True, "shinyFemale": True}},
            },
        },
    )
    assert written.status_code == 200, written.text

    rejected = client.put("/api/collection/progress", json={"mode": "overwrite", "progress": {}})
    assert rejected.status_code == 400

    client.post("/api/auth/logout")
    from tests.support import login

    assert login(client, "ash@example.com").status_code == 200
    tree = progress(client)
    scarlet = mark(tree, "sv", CHARIZARD)
    sword = mark(tree, "swsh", CHARIZARD)
    assert scarlet.get("caught") is True
    assert scarlet.get("caughtMale") is True
    assert scarlet.get("shiny") is not True
    assert sword.get("shiny") is True
    assert sword.get("shinyFemale") is True
    assert sword.get("caught") is not True


def test_signing_in_merges_guest_and_account_marks(world):
    """UC-X-09 and UC-X-10. True wins. A gender from either side stays. Shiny from one side stays with Normal from the other."""
    client = world.client
    sign_in(client, "ash@example.com")
    seeded = client.put(
        "/api/collection/progress",
        json={
            "mode": "replace",
            "progress": {
                "sv": {CHARIZARD: {"caught": True, "caughtMale": True, "shiny": False}},
            },
        },
    )
    assert seeded.status_code == 200, seeded.text

    guest = client.put(
        "/api/collection/progress",
        json={
            "mode": "merge",
            "progress": {
                "sv": {CHARIZARD: {"caught": False, "caughtFemale": True, "shiny": True, "shinyFemale": True}},
                "swsh": {"25": {"caught": True}},
            },
        },
    )
    assert guest.status_code == 200, guest.text
    tree = guest.json()["progress"]
    charizard = mark(tree, "sv", CHARIZARD)
    assert charizard.get("caught") is True
    assert charizard.get("caughtMale") is True
    assert charizard.get("caughtFemale") is True
    assert charizard.get("shiny") is True
    assert charizard.get("shinyFemale") is True
    assert mark(tree, "swsh", "25").get("caught") is True


def test_a_specimen_adds_its_mark_and_keeps_marks_on_every_save(world):
    """A shiny male from Platinum is added beside a normal female already marked in Red."""
    client = world.client
    sign_in(client, "ash@example.com")
    written = client.put(
        "/api/collection/progress",
        json={
            "mode": "replace",
            "progress": {
                "rb": {CHARIZARD: {"caught": True, "caughtFemale": True}},
                "pt": {CHARIZARD: {"caught": True, "caughtFemale": True}},
            },
        },
    )
    assert written.status_code == 200, written.text

    uploaded = client.post(
        "/api/collection/owned/from-pk",
        json={"pokemon_id": 6, "game_key": "pt", "shiny": True, "gender": "male", "filename": "shiny-charizard.pk4"},
    )
    assert uploaded.status_code == 201, uploaded.text

    tree = progress(client)
    red = mark(tree, "rb", CHARIZARD)
    platinum = mark(tree, "pt", CHARIZARD)
    assert red.get("caught") is True
    assert red.get("caughtFemale") is True
    assert red.get("shiny") is not True
    assert red.get("caughtMale") is not True
    assert platinum.get("caught") is True
    assert platinum.get("caughtFemale") is True
    assert platinum.get("shiny") is True
    assert platinum.get("shinyMale") is True


def test_deleting_a_specimen_removes_only_that_specimen_mark(world):
    """The Platinum shiny male goes away. The hand-set normal female on Red and on Platinum stays."""
    client = world.client
    sign_in(client, "ash@example.com")
    written = client.put(
        "/api/collection/progress",
        json={
            "mode": "replace",
            "progress": {
                "rb": {CHARIZARD: {"caught": True, "caughtFemale": True}},
                "pt": {CHARIZARD: {"caught": True, "caughtFemale": True, "shiny": True, "shinyFemale": True}},
            },
        },
    )
    assert written.status_code == 200, written.text
    added = client.post(
        "/api/collection/owned",
        json={"pokemon_id": 6, "game_key": "pt", "shiny": True, "gender": "male"},
    )
    assert added.status_code == 201, added.text
    owned_id = added.json()["owned_id"]

    while_present = mark(progress(client), "pt", CHARIZARD)
    assert while_present.get("caughtFemale") is True
    assert while_present.get("shinyFemale") is True
    assert while_present.get("shinyMale") is True

    removed = client.delete(f"/api/collection/owned/{owned_id}")
    assert removed.status_code == 204, removed.text
    assert client.get("/api/collection/owned", params={"pokemon_id": 6}).json()["items"] == []

    red = mark(progress(client), "rb", CHARIZARD)
    platinum = mark(progress(client), "pt", CHARIZARD)
    assert red.get("caught") is True
    assert red.get("caughtFemale") is True
    assert platinum.get("caught") is True
    assert platinum.get("caughtFemale") is True
    assert platinum.get("shiny") is True
    assert platinum.get("shinyFemale") is True
    assert platinum.get("shinyMale") is not True
