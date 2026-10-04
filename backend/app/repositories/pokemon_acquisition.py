"""Compiled acquisition text/methods per species × game."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.app.pokemon_acquisition_document import PokemonAcquisitionDocument

_CHUNK = 200


class PokemonAcquisitionRepository:
    def get(self, pokemon_id: int, game_key: str) -> dict[str, Any] | None:
        doc = PokemonAcquisitionDocument.objects(pokemon_id=pokemon_id).first()
        if doc is None:
            return None
        entry = (doc.by_game or {}).get(game_key)
        if not isinstance(entry, dict):
            return None
        return {
            "text": str(entry.get("text") or ""),
            "methods": list(entry.get("methods") or []),
        }

    def count(self) -> int:
        return int(PokemonAcquisitionDocument.objects.count())

    def upsert(self, pokemon_id: int, by_game: dict[str, dict[str, Any]]) -> None:
        now = datetime.now(timezone.utc)
        try:
            PokemonAcquisitionDocument.objects(pokemon_id=pokemon_id).modify(
                upsert=True,
                new=True,
                set__by_game=by_game,
                set__built_at=now,
                set_on_insert__pokemon_id=pokemon_id,
            )
        except NotUniqueError:
            PokemonAcquisitionDocument.objects(pokemon_id=pokemon_id).modify(
                new=True,
                set__by_game=by_game,
                set__built_at=now,
            )

    def replace_all(self, rows: list[tuple[int, dict[str, dict[str, Any]]]]) -> int:
        PokemonAcquisitionDocument.objects.delete()
        now = datetime.now(timezone.utc)
        docs = [
            PokemonAcquisitionDocument(pokemon_id=pokemon_id, by_game=by_game, built_at=now)
            for pokemon_id, by_game in rows
        ]
        for index in range(0, len(docs), _CHUNK):
            chunk = docs[index : index + _CHUNK]
            if chunk:
                PokemonAcquisitionDocument.objects.insert(chunk, load_bulk=False)
        return len(docs)
