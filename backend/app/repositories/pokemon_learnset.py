"""Compiled learnset groups for base and regional forms."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.app.pokemon_learnset_document import PokemonLearnsetDocument

_CHUNK = 200


class PokemonLearnsetRepository:
    def get(self, resource_id: int, game_key: str) -> list[dict[str, Any]] | None:
        doc = PokemonLearnsetDocument.objects(resource_id=resource_id, game_key=game_key).first()
        if doc is None:
            return None
        return [dict(group) for group in (doc.groups or []) if isinstance(group, dict)]

    def upsert(self, resource_id: int, game_key: str, form: str, groups: list[dict[str, Any]]) -> None:
        now = datetime.now(timezone.utc)
        try:
            PokemonLearnsetDocument.objects(resource_id=resource_id, game_key=game_key).modify(
                upsert=True,
                new=True,
                set__form=form,
                set__groups=groups,
                set__built_at=now,
                set_on_insert__resource_id=resource_id,
                set_on_insert__game_key=game_key,
            )
        except NotUniqueError:
            PokemonLearnsetDocument.objects(resource_id=resource_id, game_key=game_key).modify(
                new=True,
                set__form=form,
                set__groups=groups,
                set__built_at=now,
            )

    def upsert_many(self, rows: list[tuple[int, str, str, list[dict[str, Any]]]]) -> int:
        for resource_id, game_key, form, groups in rows:
            self.upsert(resource_id, game_key, form, groups)
        return len(rows)

    def replace_all(self, rows: list[tuple[int, str, str, list[dict[str, Any]]]]) -> int:
        PokemonLearnsetDocument.objects.delete()
        now = datetime.now(timezone.utc)
        docs = [
            PokemonLearnsetDocument(
                resource_id=resource_id,
                game_key=game_key,
                form=form,
                groups=groups,
                built_at=now,
            )
            for resource_id, game_key, form, groups in rows
        ]
        for index in range(0, len(docs), _CHUNK):
            chunk = docs[index : index + _CHUNK]
            if chunk:
                PokemonLearnsetDocument.objects.insert(chunk, load_bulk=False)
        return len(docs)
