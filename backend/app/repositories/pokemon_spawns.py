"""Compiled wild spawn encounters per species."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.app.pokemon_spawns_document import PokemonSpawnsDocument

_CHUNK = 200


class PokemonSpawnsRepository:
    def get(self, pokemon_id: int, form: str = "base") -> list[dict[str, Any]] | None:
        doc = PokemonSpawnsDocument.objects(pokemon_id=pokemon_id, form=form).first()
        if doc is None and form == "base":
            doc = PokemonSpawnsDocument.objects(pokemon_id=pokemon_id, form__exists=False).first()
        if doc is None:
            return None
        return list(doc.enc or [])

    def count(self) -> int:
        return int(PokemonSpawnsDocument.objects.count())

    def upsert(self, pokemon_id: int, enc: list[dict[str, Any]]) -> None:
        now = datetime.now(timezone.utc)
        try:
            PokemonSpawnsDocument.objects(pokemon_id=pokemon_id).modify(
                upsert=True,
                new=True,
                set__enc=enc,
                set__built_at=now,
                set_on_insert__pokemon_id=pokemon_id,
            )
        except NotUniqueError:
            PokemonSpawnsDocument.objects(pokemon_id=pokemon_id).modify(
                new=True,
                set__enc=enc,
                set__built_at=now,
            )

    def replace_all(self, rows: list[tuple[int, list[dict[str, Any]]]]) -> int:
        PokemonSpawnsDocument.objects.delete()
        now = datetime.now(timezone.utc)
        docs = [
            PokemonSpawnsDocument(pokemon_id=pokemon_id, enc=enc, built_at=now)
            for pokemon_id, enc in rows
        ]
        for index in range(0, len(docs), _CHUNK):
            chunk = docs[index : index + _CHUNK]
            if chunk:
                PokemonSpawnsDocument.objects.insert(chunk, load_bulk=False)
        return len(docs)

    def upsert_form(self, pokemon_id: int, form: str, enc: list[dict[str, Any]]) -> None:
        now = datetime.now(timezone.utc)
        try:
            PokemonSpawnsDocument.objects(pokemon_id=pokemon_id, form=form).modify(
                upsert=True,
                new=True,
                set__enc=enc,
                set__built_at=now,
                set_on_insert__pokemon_id=pokemon_id,
                set_on_insert__form=form,
            )
        except NotUniqueError:
            PokemonSpawnsDocument.objects(pokemon_id=pokemon_id, form=form).modify(
                new=True,
                set__enc=enc,
                set__built_at=now,
            )
