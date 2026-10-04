from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.app.poke_api_cache_entry import PokeApiCacheEntry

_IN_CHUNK = 500
_SPECIES_PATH = "pokemon-species/"
_ENCOUNTERS_SUFFIX = "/encounters"


@dataclass(frozen=True)
class CacheRecord:
    path: str
    payload: Any
    fetched_at: datetime
    etag: str | None = None


def _chain_id_from_url(url: str) -> int | None:
    match = url.rstrip("/").rsplit("/", 1)
    if len(match) != 2 or not match[1].isdigit():
        return None
    return int(match[1])


def _three_stage_finals(coll: Any, chain_ids: set[int]) -> set[int]:
    """Species that end a path of exactly three stages."""
    finals: set[int] = set()
    paths = [f"evolution-chain/{chain_id}" for chain_id in sorted(chain_ids)]
    for index in range(0, len(paths), _IN_CHUNK):
        chunk = paths[index : index + _IN_CHUNK]
        cursor = coll.find({"path": {"$in": chunk}}, {"body.data.chain": 1, "_id": 0})
        for doc in cursor:
            body = doc.get("body") or {}
            data = body.get("data") if isinstance(body, dict) else None
            chain = data.get("chain") if isinstance(data, dict) else None
            if isinstance(chain, dict):
                _collect_depth_finals(chain, 1, finals)
    return finals


_FOSSIL_REVIVAL = (
    "resurrected from",
    "regenerated from a fossil",
    "restored from a fossil",
    "revived from a fossil",
    "generated from a fossil",
)


def _mentions_fossil(data: dict[str, Any]) -> bool:
    """A species revived from a fossil, including the Galar fossil combinations."""
    for entry in data.get("genera") or []:
        if not isinstance(entry, dict) or (entry.get("language") or {}).get("name") != "en":
            continue
        if str(entry.get("genus") or "") == "Fossil Pokémon":
            return True
    for entry in data.get("flavor_text_entries") or []:
        if not isinstance(entry, dict) or (entry.get("language") or {}).get("name") != "en":
            continue
        text = " ".join(str(entry.get("flavor_text") or "").lower().split())
        if "living fossil" in text or "said to be" in text or "resembles" in text:
            continue
        if any(phrase in text for phrase in _FOSSIL_REVIVAL):
            return True
    return False


def _chain_species(node: dict[str, Any], found: set[int]) -> None:
    species_url = ((node.get("species") or {}).get("url") or "") if isinstance(node.get("species"), dict) else ""
    species_id = _chain_id_from_url(species_url)
    if species_id:
        found.add(species_id)
    for child in node.get("evolves_to") or []:
        if isinstance(child, dict):
            _chain_species(child, found)


def _lines_containing(coll: Any, chain_ids: set[int], seeds: set[int]) -> set[int]:
    """Every species in an evolution chain that includes one of ``seeds``."""
    found: set[int] = set()
    paths = [f"evolution-chain/{chain_id}" for chain_id in sorted(chain_ids)]
    for index in range(0, len(paths), _IN_CHUNK):
        chunk = paths[index : index + _IN_CHUNK]
        cursor = coll.find({"path": {"$in": chunk}}, {"body.data.chain": 1, "_id": 0})
        for doc in cursor:
            body = doc.get("body") or {}
            data = body.get("data") if isinstance(body, dict) else None
            chain = data.get("chain") if isinstance(data, dict) else None
            if not isinstance(chain, dict):
                continue
            members: set[int] = set()
            _chain_species(chain, members)
            if members & seeds:
                found.update(members)
    return found


def _fossil_ids(coll: Any, chain_ids: set[int], mentioned: set[int]) -> set[int]:
    """A fossil line is every species in a chain where one member is revived from a fossil."""
    fossils: set[int] = set()
    paths = [f"evolution-chain/{chain_id}" for chain_id in sorted(chain_ids)]
    for index in range(0, len(paths), _IN_CHUNK):
        chunk = paths[index : index + _IN_CHUNK]
        cursor = coll.find({"path": {"$in": chunk}}, {"body.data.chain": 1, "_id": 0})
        for doc in cursor:
            body = doc.get("body") or {}
            data = body.get("data") if isinstance(body, dict) else None
            chain = data.get("chain") if isinstance(data, dict) else None
            if not isinstance(chain, dict):
                continue
            members: set[int] = set()
            _chain_species(chain, members)
            if members & mentioned:
                fossils.update(members)
    fossils.update(species_id for species_id in mentioned if species_id not in fossils)
    return fossils


def _collect_depth_finals(node: dict[str, Any], depth: int, finals: set[int]) -> None:
    children = [child for child in (node.get("evolves_to") or []) if isinstance(child, dict)]
    if children:
        for child in children:
            _collect_depth_finals(child, depth + 1, finals)
        return
    if depth != 3:
        return
    species_url = ((node.get("species") or {}).get("url") or "") if isinstance(node.get("species"), dict) else ""
    species_id = _chain_id_from_url(species_url)
    if species_id:
        finals.add(species_id)


def _base_stat_totals(coll: Any, pokemon_ids: list[int]) -> dict[int, int]:
    totals: dict[int, int] = {}
    paths = [f"pokemon/{pokemon_id}" for pokemon_id in pokemon_ids]
    for index in range(0, len(paths), _IN_CHUNK):
        chunk = paths[index : index + _IN_CHUNK]
        cursor = coll.find({"path": {"$in": chunk}}, {"path": 1, "body.data.stats": 1, "_id": 0})
        for doc in cursor:
            path = str(doc.get("path") or "")
            pokemon_id = int(path[len("pokemon/") :]) if path.startswith("pokemon/") and path[len("pokemon/") :].isdigit() else None
            if pokemon_id is None:
                continue
            body = doc.get("body") or {}
            data = body.get("data") if isinstance(body, dict) else None
            stats = data.get("stats") if isinstance(data, dict) else None
            if not isinstance(stats, list):
                continue
            total = 0
            for entry in stats:
                if isinstance(entry, dict) and isinstance(entry.get("base_stat"), int):
                    total += entry["base_stat"]
            totals[pokemon_id] = total
    return totals


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

    def scan_species_rarity(self, limit: int) -> tuple[list[int], list[int], list[int], list[int]]:
        """Legendary, mythical, pseudo-legendary, and fossil National Dex ids.

        Legendary and mythical come from the species flags. A species flagged both
        ways is mythical.         A pseudo-legendary line is a three-stage family whose final form totals
        600 base stats. Every stage in that line is included. A fossil species shares an
        evolution chain with a Pokémon revived from a fossil. The first match wins:
        mythical, legendary, pseudo, fossil.
        """
        coll = PokeApiCacheEntry._get_collection()
        legendaries: list[int] = []
        mythicals: list[int] = []
        flagged: set[int] = set()
        mentioned: set[int] = set()
        chain_ids: set[int] = set()
        species_paths = [f"pokemon-species/{pokemon_id}" for pokemon_id in range(1, limit + 1)]
        for index in range(0, len(species_paths), _IN_CHUNK):
            chunk = species_paths[index : index + _IN_CHUNK]
            cursor = coll.find(
                {"path": {"$in": chunk}},
                {
                    "path": 1,
                    "body.data.is_legendary": 1,
                    "body.data.is_mythical": 1,
                    "body.data.evolution_chain": 1,
                    "body.data.flavor_text_entries": 1,
                    "body.data.genera": 1,
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
                    continue
                if data.get("is_mythical") is True:
                    mythicals.append(pokemon_id)
                    flagged.add(pokemon_id)
                elif data.get("is_legendary") is True:
                    legendaries.append(pokemon_id)
                    flagged.add(pokemon_id)
                elif _mentions_fossil(data):
                    mentioned.add(pokemon_id)
                chain_url = ((data.get("evolution_chain") or {}).get("url") or "") if isinstance(data.get("evolution_chain"), dict) else ""
                chain_id = _chain_id_from_url(chain_url)
                if chain_id:
                    chain_ids.add(chain_id)
        finals = _three_stage_finals(coll, chain_ids)
        totals = _base_stat_totals(coll, [pokemon_id for pokemon_id in finals if pokemon_id not in flagged and pokemon_id <= limit])
        pseudo_finals = {pokemon_id for pokemon_id, total in totals.items() if total == 600}
        pseudos = sorted(
            pokemon_id
            for pokemon_id in _lines_containing(coll, chain_ids, pseudo_finals)
            if pokemon_id not in flagged and pokemon_id <= limit
        )
        taken = flagged | set(pseudos)
        fossils = sorted(pokemon_id for pokemon_id in _fossil_ids(coll, chain_ids, mentioned) if pokemon_id not in taken and pokemon_id <= limit)
        legendaries.sort()
        mythicals.sort()
        return legendaries, mythicals, pseudos, fossils

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
