"""One row per Pokémon form. The Pokédex number is shared; the database id is not."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.catalog.pokemon_form import can_capture
from app.db.documents import PokemonDocument, PokemonStats


def types_from_payload(pokemon: dict[str, Any] | None) -> list[str]:
    if not pokemon:
        return []
    names: list[str] = []
    for slot in pokemon.get("types") or []:
        if not isinstance(slot, dict):
            continue
        name = ((slot.get("type") or {}).get("name") or "").strip()
        if name:
            names.append(name)
    return names


def _stats_from_payload(pokemon: dict[str, Any] | None) -> PokemonStats | None:
    if not pokemon:
        return None
    values: dict[str, int] = {}
    for entry in pokemon.get("stats") or []:
        name = ((entry.get("stat") or {}).get("name") or "").replace("-", "_")
        if name == "special_attack":
            key = "special_attack"
        elif name == "special_defense":
            key = "special_defense"
        else:
            key = name
        if key in {"hp", "attack", "defense", "special_attack", "special_defense", "speed"}:
            values[key] = int(entry.get("base_stat") or 0)
    if len(values) != 6:
        return None
    return PokemonStats(**values)


class PokemonRepository:
    def get(self, pokedex_id: int, form: str) -> PokemonDocument | None:
        return PokemonDocument.objects(pokedex_id=pokedex_id, form=form).first()

    def get_by_resource_id(self, resource_id: int) -> PokemonDocument | None:
        return PokemonDocument.objects(resource_id=resource_id).first()

    def get_by_id(self, pokemon_id: ObjectId) -> PokemonDocument | None:
        return PokemonDocument.objects(id=pokemon_id).first()

    def upsert(
        self,
        *,
        pokedex_id: int,
        form: str,
        name: str,
        resource_id: int,
        stats: PokemonStats | None = None,
        types: list[str] | None = None,
    ) -> PokemonDocument:
        now = datetime.now(timezone.utc)
        doc = self.get(pokedex_id, form)
        if doc is None:
            doc = PokemonDocument(pokedex_id=pokedex_id, form=form, updated_at=now)
        doc.name = name.strip()
        doc.resource_id = resource_id
        doc.capture = can_capture(form)
        if stats is not None:
            doc.stats = stats
        if types:
            doc.types = list(types)
        doc.updated_at = now
        doc.save()
        return doc

    def rarity_groups(self) -> dict[str, list[int]]:
        """National Dex ids by stored rarity. One id per species, from the base row."""
        groups: dict[str, list[int]] = {
            "mythical": [],
            "legendary": [],
            "pseudo": [],
            "fossil": [],
            "starter": [],
        }
        query = PokemonDocument.objects(form="base", rarity__ne=None).only("pokedex_id", "rarity")
        for doc in query:
            bucket = groups.get(str(doc.rarity or ""))
            if bucket is not None:
                bucket.append(int(doc.pokedex_id))
        for bucket in groups.values():
            bucket.sort()
        return groups

    def base_pokedex_ids(self) -> dict[ObjectId, int]:
        return {
            doc.id: int(doc.pokedex_id)
            for doc in PokemonDocument.objects(form="base").only("id", "pokedex_id")
        }

    def list_alternate_forms(self) -> list[dict[str, Any]]:
        """Mega, Gigantamax, and regional rows. Base species are omitted."""
        rows: list[dict[str, Any]] = []
        query = PokemonDocument.objects(form__ne="base").only(
            "pokedex_id", "form", "name", "resource_id", "types", "capture"
        )
        for doc in query:
            rows.append(
                {
                    "pokedex_id": int(doc.pokedex_id),
                    "form": doc.form,
                    "name": doc.name,
                    "resource_id": int(doc.resource_id),
                    "types": list(doc.types or []),
                    "capture": bool(doc.capture),
                }
            )
        rows.sort(key=lambda row: (row["pokedex_id"], row["form"]))
        return rows
