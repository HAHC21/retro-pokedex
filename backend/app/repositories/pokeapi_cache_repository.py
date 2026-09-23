from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.documents import PokeApiCacheEntry

_IN_CHUNK = 500
_SPECIES_PATH = "pokemon-species/"
_ENCOUNTERS_SUFFIX = "/encounters"


@dataclass(frozen=True)
class CacheRecord:
    path: str
    payload: Any
    fetched_at: datetime
    etag: str | None = None


def _species_id_from_path(path: str) -> int | None:
    if not path.startswith(_SPECIES_PATH):
        return None
    rest = path[len(_SPECIES_PATH) :]
    if not rest.isdigit():
        return None
    return int(rest)


def _encounter_id_from_path(path: str) -> int | None:
    if not path.startswith("pokemon/") or not path.endswith(_ENCOUNTERS_SUFFIX):
        return None
    mid = path[len("pokemon/") : -len(_ENCOUNTERS_SUFFIX)]
    if not mid.isdigit():
        return None
    return int(mid)


class PokeApiCacheRepository:
    """Persistence for PokéAPI cache-aside entries (sync; call via to_thread)."""

    def get(self, path: str) -> CacheRecord | None:
        entry = PokeApiCacheEntry.objects(path=path).first()
        if entry is None:
            return None
        return CacheRecord(
            path=entry.path,
            payload=entry.body.get("data"),
            fetched_at=entry.fetched_at,
            etag=entry.etag,
        )

    def get_many(self, paths: Sequence[str]) -> dict[str, Any]:
        """Return path → payload for every cached row in ``paths`` (missing keys omitted)."""
        payloads: dict[str, Any] = {}
        unique = list(dict.fromkeys(paths))
        for index in range(0, len(unique), _IN_CHUNK):
            chunk = unique[index : index + _IN_CHUNK]
            for entry in PokeApiCacheEntry.objects(path__in=chunk).only("path", "body"):
                payloads[str(entry.path)] = entry.body.get("data")
        return payloads

    def scan_obtain_sources(self, limit: int) -> tuple[dict[int, Any], dict[int, Any]]:
        """Bulk-read encounter lists + species ``evolves_from_species`` for ids 1..limit.

        Species rows use a narrow projection (parent ref only). Encounter rows still
        need ``body.data``; callers should persist a slim obtain index so this runs rarely.
        """
        coll = PokeApiCacheEntry._get_collection()
        encounters: dict[int, Any] = {}
        parent_refs: dict[int, Any] = {}

        species_paths = [f"pokemon-species/{pokemon_id}" for pokemon_id in range(1, limit + 1)]
        for index in range(0, len(species_paths), _IN_CHUNK):
            chunk = species_paths[index : index + _IN_CHUNK]
            cursor = coll.find(
                {"path": {"$in": chunk}},
                {"path": 1, "body.data.evolves_from_species": 1, "_id": 0},
            )
            for doc in cursor:
                pokemon_id = _species_id_from_path(str(doc.get("path") or ""))
                if pokemon_id is None or pokemon_id > limit:
                    continue
                body = doc.get("body") or {}
                data = body.get("data") if isinstance(body, dict) else None
                if isinstance(data, dict):
                    parent_refs[pokemon_id] = data.get("evolves_from_species")
                else:
                    parent_refs[pokemon_id] = None

        encounter_paths = [f"pokemon/{pokemon_id}/encounters" for pokemon_id in range(1, limit + 1)]
        for index in range(0, len(encounter_paths), _IN_CHUNK):
            chunk = encounter_paths[index : index + _IN_CHUNK]
            cursor = coll.find(
                {"path": {"$in": chunk}},
                {"path": 1, "body.data": 1, "_id": 0},
            )
            for doc in cursor:
                pokemon_id = _encounter_id_from_path(str(doc.get("path") or ""))
                if pokemon_id is None or pokemon_id > limit:
                    continue
                body = doc.get("body") or {}
                encounters[pokemon_id] = body.get("data") if isinstance(body, dict) else None

        return encounters, parent_refs

    def scan_species_evolution_refs(self, limit: int) -> dict[int, dict[str, Any]]:
        """pokemon_id → {name, evolves_from_species, evolution_chain} (projected)."""
        coll = PokeApiCacheEntry._get_collection()
        refs: dict[int, dict[str, Any]] = {}
        species_paths = [f"pokemon-species/{pokemon_id}" for pokemon_id in range(1, limit + 1)]
        for index in range(0, len(species_paths), _IN_CHUNK):
            chunk = species_paths[index : index + _IN_CHUNK]
            cursor = coll.find(
                {"path": {"$in": chunk}},
                {
                    "path": 1,
                    "body.data.name": 1,
                    "body.data.evolves_from_species": 1,
                    "body.data.evolution_chain": 1,
                    "_id": 0,
                },
            )
            for doc in cursor:
                pokemon_id = _species_id_from_path(str(doc.get("path") or ""))
                if pokemon_id is None or pokemon_id > limit:
                    continue
                body = doc.get("body") or {}
                data = body.get("data") if isinstance(body, dict) else None
                if not isinstance(data, dict):
                    refs[pokemon_id] = {}
                    continue
                refs[pokemon_id] = {
                    "name": data.get("name"),
                    "evolves_from_species": data.get("evolves_from_species"),
                    "evolution_chain": data.get("evolution_chain"),
                }
        return refs

    def existing_paths(self, paths: Sequence[str]) -> set[str]:
        found: set[str] = set()
        unique = list(dict.fromkeys(paths))
        for index in range(0, len(unique), _IN_CHUNK):
            chunk = unique[index : index + _IN_CHUNK]
            found.update(
                str(entry.path) for entry in PokeApiCacheEntry.objects(path__in=chunk).only("path")
            )
        return found

    def upsert(self, path: str, payload: Any, *, etag: str | None = None) -> CacheRecord:
        now = datetime.now(timezone.utc)
        try:
            entry = PokeApiCacheEntry.objects(path=path).modify(
                upsert=True,
                new=True,
                set__body={"data": payload},
                set__fetched_at=now,
                set__etag=etag,
                set_on_insert__path=path,
            )
        except NotUniqueError:
            entry = PokeApiCacheEntry.objects(path=path).modify(
                new=True,
                set__body={"data": payload},
                set__fetched_at=now,
                set__etag=etag,
            )
        if entry is None:
            entry = PokeApiCacheEntry.objects(path=path).first()
        if entry is None:
            raise RuntimeError(f"Failed to upsert cache entry for {path}")
        return CacheRecord(path=path, payload=payload, fetched_at=now, etag=etag)
