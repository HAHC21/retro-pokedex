"""One row per Pokémon form. The Pokédex number is shared; the database id is not."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from mongoengine.connection import get_db

from app.catalog.pokemon_form import can_capture, form_key, variant_display_name
from app.db.app.pokemon_document import PokemonDocument
from app.db.app.pokemon_stats import PokemonStats


def _trailing_id(url: str) -> int:
    try:
        return int(url.rstrip("/").split("/")[-1])
    except (TypeError, ValueError):
        return 0


def _species_id(path: str) -> int:
    tail = path.rsplit("/", 1)[-1]
    return int(tail) if tail.isdigit() else 0


def _projected_cache(query: dict[str, Any], projection: dict[str, int]) -> list[dict[str, Any]]:
    return list(get_db()["pokeapi_cache"].find(query, projection))


def _cached_variant_forms(present: set[tuple[int, str]]) -> list[dict[str, Any]]:
    """Variants that are not stored as their own Pokémon rows."""
    bases = {
        int(doc.pokedex_id): doc
        for doc in PokemonDocument.objects(form="base").only("pokedex_id", "name", "resource_id", "types")
    }
    species_slug: dict[int, str] = {}
    own: list[dict[str, Any]] = []
    seen = set(present)
    species_rows = _projected_cache(
        {"path": {"$regex": r"^pokemon-species/\d+$"}},
        {"path": 1, "body.data.name": 1, "body.data.varieties": 1, "_id": 0},
    )
    for doc in species_rows:
        pokedex_id = _species_id(str(doc.get("path") or ""))
        base = bases.get(pokedex_id)
        data = ((doc.get("body") or {}).get("data") or {}) if isinstance(doc.get("body"), dict) else {}
        slug = str(data.get("name") or "")
        if pokedex_id <= 0 or base is None or not slug:
            continue
        species_slug[pokedex_id] = slug
        for variety in data.get("varieties") or []:
            if not isinstance(variety, dict) or variety.get("is_default"):
                continue
            pokemon = variety.get("pokemon") or {}
            key = form_key(str(pokemon.get("name") or ""), slug)
            if not key or not key.startswith("variant-") or (pokedex_id, key) in seen:
                continue
            resource_id = _trailing_id(str(pokemon.get("url") or ""))
            if resource_id <= 0:
                continue
            seen.add((pokedex_id, key))
            own.append(
                {
                    "pokedex_id": pokedex_id,
                    "form": key,
                    "name": variant_display_name(str(base.name), key),
                    "resource_id": resource_id,
                    "types": list(base.types or []),
                    "capture": True,
                    "sprite_form": None,
                }
            )

    pokemon_ids = {int(row["resource_id"]) for row in own}
    pokemon_ids.update(int(base.resource_id) for base in bases.values() if int(base.pokedex_id) in species_slug)
    cached: dict[int, dict[str, Any]] = {}
    paths = [f"pokemon/{resource_id}" for resource_id in sorted(pokemon_ids)]
    for index in range(0, len(paths), 500):
        chunk = paths[index : index + 500]
        for doc in _projected_cache(
            {"path": {"$in": chunk}},
            {"path": 1, "body.data.forms": 1, "body.data.types": 1, "_id": 0},
        ):
            resource_id = _species_id(str(doc.get("path") or ""))
            data = ((doc.get("body") or {}).get("data") or {}) if isinstance(doc.get("body"), dict) else {}
            if resource_id and isinstance(data, dict):
                cached[resource_id] = data
    for row in own:
        types = types_from_payload(cached.get(int(row["resource_id"])))
        if types:
            row["types"] = types

    cosmetic: list[dict[str, Any]] = []
    for pokedex_id, slug in species_slug.items():
        base = bases[pokedex_id]
        payload = cached.get(int(base.resource_id))
        if not payload:
            continue
        for entry in payload.get("forms") or []:
            if not isinstance(entry, dict):
                continue
            key = form_key(str(entry.get("name") or ""), slug)
            if not key or not key.startswith("variant-") or (pokedex_id, key) in seen:
                continue
            seen.add((pokedex_id, key))
            cosmetic.append(
                {
                    "pokedex_id": pokedex_id,
                    "form": key,
                    "name": variant_display_name(str(base.name), key),
                    "resource_id": int(base.resource_id),
                    "types": list(base.types or []),
                    "capture": True,
                    "sprite_form": key.removeprefix("variant-"),
                }
            )
    return own + cosmetic


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
        """Mega, Gigantamax, regional, and variant rows. Base species are omitted.

        Stored rows cover battle and regional forms. Own-id variants (Rotom appliances)
        and shared looks (Floette's flower colors) are read from the PokéAPI cache so
        search can list every form the species page shows.
        """
        rows: list[dict[str, Any]] = []
        present: set[tuple[int, str]] = set()
        query = PokemonDocument.objects(form__ne="base").only(
            "pokedex_id", "form", "name", "resource_id", "types", "capture"
        )
        for doc in query:
            key = (int(doc.pokedex_id), str(doc.form))
            present.add(key)
            rows.append(
                {
                    "pokedex_id": key[0],
                    "form": key[1],
                    "name": doc.name,
                    "resource_id": int(doc.resource_id),
                    "types": list(doc.types or []),
                    "capture": bool(doc.capture),
                }
            )
        rows.extend(_cached_variant_forms(present))
        rows.sort(key=lambda row: (row["pokedex_id"], row["form"]))
        return rows

    def list_forms(self, resource_ids: list[int] | None = None) -> list[PokemonDocument]:
        query = PokemonDocument.objects
        if resource_ids is not None:
            if not resource_ids:
                return []
            query = query.filter(resource_id__in=list(resource_ids))
        return list(query)
