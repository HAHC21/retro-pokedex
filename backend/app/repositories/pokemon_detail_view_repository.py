"""Compiled SPA detail payloads per National Dex species."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.documents import PokemonDetailViewDocument

_CHUNK = 100


class PokemonDetailViewRepository:
    def get(self, pokemon_id: int, form: str = "base") -> dict[str, Any] | None:
        doc = PokemonDetailViewDocument.objects(pokemon_id=pokemon_id, form=form).first()
        if doc is None and form == "base":
            doc = PokemonDetailViewDocument.objects(pokemon_id=pokemon_id, form__exists=False).first()
        if doc is None:
            return None
        payload = doc.payload
        return dict(payload) if isinstance(payload, dict) else None

    def count(self) -> int:
        return int(PokemonDetailViewDocument.objects.count())

    def upsert(self, pokemon_id: int, payload: dict[str, Any]) -> None:
        now = datetime.now(timezone.utc)
        try:
            PokemonDetailViewDocument.objects(pokemon_id=pokemon_id).modify(
                upsert=True,
                new=True,
                set__payload=payload,
                set__built_at=now,
                set_on_insert__pokemon_id=pokemon_id,
            )
        except NotUniqueError:
            PokemonDetailViewDocument.objects(pokemon_id=pokemon_id).modify(
                new=True,
                set__payload=payload,
                set__built_at=now,
            )

    def replace_all(self, rows: list[tuple[int, dict[str, Any]]]) -> int:
        PokemonDetailViewDocument.objects.delete()
        now = datetime.now(timezone.utc)
        docs = [
            PokemonDetailViewDocument(pokemon_id=pokemon_id, payload=payload, built_at=now)
            for pokemon_id, payload in rows
        ]
        for index in range(0, len(docs), _CHUNK):
            chunk = docs[index : index + _CHUNK]
            if chunk:
                PokemonDetailViewDocument.objects.insert(chunk, load_bulk=False)
        return len(docs)
