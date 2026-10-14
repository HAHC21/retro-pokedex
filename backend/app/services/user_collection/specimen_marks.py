"""Combine hand-set marks with the specimens stored on each save."""

from __future__ import annotations

from typing import Any

from app.repositories.user_collection import UserCollectionRepository


def _specimen_entry(source: dict[str, Any]) -> dict[str, Any]:
    gender = source.get("gender")
    if source.get("shiny"):
        entry: dict[str, Any] = {"shiny": True}
        if gender == "male":
            entry["shinyMale"] = True
        elif gender == "female":
            entry["shinyFemale"] = True
        return entry
    entry = {"caught": True}
    if gender == "male":
        entry["caughtMale"] = True
    elif gender == "female":
        entry["caughtFemale"] = True
    return entry


def _progress_key(pokemon_id: int, form: str) -> str:
    return str(pokemon_id) if form == "base" else f"{pokemon_id}:{form}"


def apply_specimens(manual: dict[str, dict[str, dict[str, Any]]], sources: list[dict[str, Any]]) -> dict[str, dict[str, dict[str, Any]]]:
    """True wins on each save. A specimen adds its own flags and leaves every other flag in place."""
    combined: dict[str, dict[str, dict[str, Any]]] = {
        game: dict(marks) for game, marks in manual.items()
    }
    for source in sources:
        game_key = str(source["game_key"])
        key = _progress_key(int(source["pokemon_id"]), str(source.get("form") or "base"))
        bucket = combined.setdefault(game_key, {})
        bucket[key] = UserCollectionRepository._merge_entry(bucket.get(key) or {}, _specimen_entry(source))
    return combined
