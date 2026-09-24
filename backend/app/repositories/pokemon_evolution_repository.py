"""Compiled evolution steps + evolve labels per species."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.documents import PokemonEvolutionDocument

_CHUNK = 200


class PokemonEvolutionRepository:
    def get(self, pokemon_id: int, form: str = "base") -> dict[str, Any] | None:
        doc = PokemonEvolutionDocument.objects(pokemon_id=pokemon_id, form=form).first()
        if doc is None and form == "base":
            doc = PokemonEvolutionDocument.objects(pokemon_id=pokemon_id, form__exists=False).first()
        if doc is None:
            return None
        return {
            "steps": list(doc.steps or []),
            "parent_id": int(doc.parent_id) if doc.parent_id is not None else None,
            "parent_name": doc.parent_name,
            "evolve_label": doc.evolve_label,
        }

    def count(self) -> int:
        return int(PokemonEvolutionDocument.objects.count())

    def evolve_labels_map(self) -> dict[int, str | None]:
        return {
            int(doc.pokemon_id): (str(doc.evolve_label) if doc.evolve_label else None)
            for doc in PokemonEvolutionDocument.objects.only("pokemon_id", "evolve_label")
        }

    def steps_map(self) -> dict[int, list[dict[str, Any]]]:
        return {
            int(doc.pokemon_id): list(doc.steps or [])
            for doc in PokemonEvolutionDocument.objects.only("pokemon_id", "steps")
        }

    def upsert(
        self,
        pokemon_id: int,
        *,
        steps: list[dict[str, Any]],
        parent_id: int | None,
        parent_name: str | None,
        evolve_label: str | None,
    ) -> None:
        now = datetime.now(timezone.utc)
        try:
            PokemonEvolutionDocument.objects(pokemon_id=pokemon_id).modify(
                upsert=True,
                new=True,
                set__steps=steps,
                set__parent_id=parent_id,
                set__parent_name=parent_name,
                set__evolve_label=evolve_label,
                set__built_at=now,
                set_on_insert__pokemon_id=pokemon_id,
            )
        except NotUniqueError:
            PokemonEvolutionDocument.objects(pokemon_id=pokemon_id).modify(
                new=True,
                set__steps=steps,
                set__parent_id=parent_id,
                set__parent_name=parent_name,
                set__evolve_label=evolve_label,
                set__built_at=now,
            )

    def replace_all(self, rows: list[dict[str, Any]]) -> int:
        PokemonEvolutionDocument.objects.delete()
        now = datetime.now(timezone.utc)
        docs = [
            PokemonEvolutionDocument(
                pokemon_id=int(row["pokemon_id"]),
                steps=list(row.get("steps") or []),
                parent_id=row.get("parent_id"),
                parent_name=row.get("parent_name"),
                evolve_label=row.get("evolve_label"),
                built_at=now,
            )
            for row in rows
        ]
        for index in range(0, len(docs), _CHUNK):
            chunk = docs[index : index + _CHUNK]
            if chunk:
                PokemonEvolutionDocument.objects.insert(chunk, load_bulk=False)
        return len(docs)
