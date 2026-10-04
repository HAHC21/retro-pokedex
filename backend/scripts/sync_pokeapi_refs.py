"""Warm PokéAPI ability + location payloads into Mongo ``pokeapi_cache``.

``sync_pokeapi`` never fetched these. They are needed so ``compile_poke_tables``
can fill ability blurbs and spawn region/loc labels.

Discovers refs from existing warehouse rows (pokemon + encounters), then
cache-asides each missing path from PokéAPI (skips rows that already exist
unless ``--force``).

Usage (from backend/ with venv active and MONGODB_URI set):

    python -m scripts.sync_pokeapi_refs
    python -m scripts.sync_pokeapi_refs --abilities-only
    python -m scripts.sync_pokeapi_refs --locations-only
    python -m scripts.sync_pokeapi_refs --force

Afterward:

    python -m scripts.compile_poke_tables
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path
from typing import Any

# Allow `python -m scripts.sync_pokeapi_refs` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import get_pokeapi_cache_repository, get_pokeapi_client, shutdown_external_clients
from app.integrations.pokeapi.client import PokeApiClient
from app.integrations.pokeapi.mapper import pokemon_id_from_url
from app.repositories.pokeapi_cache import PokeApiCacheRepository

DEFAULT_LIMIT = 1025
RETRY_WAIT_SECONDS = 30.0
MAX_ATTEMPTS = 5
_CHUNK = 200


def _id_from_url(url: str) -> int:
    try:
        return pokemon_id_from_url(url)
    except (TypeError, ValueError):
        return 0


async def _warm(
    client: PokeApiClient,
    path: str,
    *,
    force: bool,
    delay_seconds: float,
) -> str:
    status = "error"
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            status = await client.cache_if_absent(path, None, force=force)
            break
        except Exception as exc:  # noqa: BLE001 — retry the same path
            status = "error"
            if attempt >= MAX_ATTEMPTS:
                print(f"  error {path}: {exc}")
                return "error"
            print(f"  error {path}: {exc} (retry {attempt}/{MAX_ATTEMPTS - 1} in {RETRY_WAIT_SECONDS:g}s)")
            await asyncio.sleep(RETRY_WAIT_SECONDS)
    if delay_seconds > 0 and status in {"fetched", "missing"}:
        await asyncio.sleep(delay_seconds)
    return status


async def _warm_paths(
    client: PokeApiClient,
    paths: list[str],
    *,
    force: bool,
    delay_seconds: float,
    label: str,
) -> dict[str, int]:
    counts = {"skip": 0, "fetched": 0, "missing": 0, "error": 0}
    total = len(paths)
    print(f"Warming {total} {label}…")
    for index, path in enumerate(paths, start=1):
        status = await _warm(client, path, force=force, delay_seconds=delay_seconds)
        counts[status] = counts.get(status, 0) + 1
        if index == 1 or index == total or index % 50 == 0 or status == "error":
            print(
                f"  [{index}/{total}] {path}  "
                f"fetched={counts['fetched']} skip={counts['skip']} "
                f"missing={counts['missing']} error={counts['error']}"
            )
    return counts


async def _discover_ability_names(client: PokeApiClient, *, limit: int) -> list[str]:
    names: set[str] = set()
    for start in range(1, limit + 1, _CHUNK):
        end = min(limit, start + _CHUNK - 1)
        paths = [f"pokemon/{pokemon_id}" for pokemon_id in range(start, end + 1)]
        payloads = await client.get_cached_many(paths)
        for data in payloads.values():
            if not isinstance(data, dict):
                continue
            for entry in data.get("abilities") or []:
                if not isinstance(entry, dict):
                    continue
                ability = entry.get("ability") if isinstance(entry.get("ability"), dict) else {}
                name = (ability or {}).get("name") or ""
                if name:
                    names.add(str(name))
    return sorted(names)


async def _discover_area_ids(client: PokeApiClient, *, limit: int) -> list[int]:
    encounters, _ = await client.scan_obtain_sources(limit)
    area_ids: set[int] = set()
    for raw in encounters.values():
        if not isinstance(raw, list):
            continue
        for entry in raw:
            area = entry.get("location_area") or {}
            area_id = _id_from_url((area.get("url") or "") if isinstance(area, dict) else "")
            if area_id:
                area_ids.add(area_id)
    return sorted(area_ids)


async def _discover_location_ids(client: PokeApiClient, area_ids: list[int]) -> list[int]:
    payloads = await client.get_cached_many([f"location-area/{area_id}" for area_id in area_ids])
    loc_ids: set[int] = set()
    for payload in payloads.values():
        if not isinstance(payload, dict):
            continue
        loc = payload.get("location") if isinstance(payload.get("location"), dict) else {}
        loc_id = _id_from_url((loc or {}).get("url") or "")
        if loc_id:
            loc_ids.add(loc_id)
    return sorted(loc_ids)


async def run(
    *,
    limit: int,
    force: bool,
    delay_seconds: float,
    abilities: bool,
    locations: bool,
) -> None:
    client = get_pokeapi_client()
    cache: PokeApiCacheRepository = get_pokeapi_cache_repository()
    print(f"Discovering refs from pokeapi_cache (limit={limit})…")

    if abilities:
        ability_names = await _discover_ability_names(client, limit=limit)
        ability_paths = [f"ability/{name}" for name in ability_names]
        if not force:
            existing = cache.existing_paths(ability_paths)
            print(f"Abilities: {len(ability_paths)} unique  already cached: {len(existing)}")
        await _warm_paths(
            client,
            ability_paths,
            force=force,
            delay_seconds=delay_seconds,
            label="abilities",
        )

    if locations:
        area_ids = await _discover_area_ids(client, limit=limit)
        area_paths = [f"location-area/{area_id}" for area_id in area_ids]
        if not force:
            existing = cache.existing_paths(area_paths)
            print(f"Location areas: {len(area_paths)} unique  already cached: {len(existing)}")
        await _warm_paths(
            client,
            area_paths,
            force=force,
            delay_seconds=delay_seconds,
            label="location-areas",
        )

        loc_ids = await _discover_location_ids(client, area_ids)
        loc_paths = [f"location/{loc_id}" for loc_id in loc_ids]
        if not force:
            existing = cache.existing_paths(loc_paths)
            print(f"Locations: {len(loc_paths)} unique  already cached: {len(existing)}")
        await _warm_paths(
            client,
            loc_paths,
            force=force,
            delay_seconds=delay_seconds,
            label="locations",
        )

    print("Done. Next: python -m scripts.compile_poke_tables")


async def _run(**kwargs: Any) -> None:
    try:
        await run(**kwargs)
    finally:
        await shutdown_external_clients()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Warm ability + location PokéAPI payloads into pokeapi_cache",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"National Dex size to scan for refs (default {DEFAULT_LIMIT})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Refetch even when a cache row already exists",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.05,
        help="Pause after each network fetch (PokéAPI fair use, default 0.05)",
    )
    parser.add_argument(
        "--abilities-only",
        action="store_true",
        help="Only warm ability/*",
    )
    parser.add_argument(
        "--locations-only",
        action="store_true",
        help="Only warm location-area/* and location/*",
    )
    args = parser.parse_args()
    if args.abilities_only and args.locations_only:
        parser.error("Use only one of --abilities-only / --locations-only")

    abilities = not args.locations_only
    locations = not args.abilities_only

    connect_mongo()
    try:
        asyncio.run(
            _run(
                limit=max(1, args.limit),
                force=args.force,
                delay_seconds=max(0.0, args.delay),
                abilities=abilities,
                locations=locations,
            )
        )
    finally:
        disconnect_mongo()


if __name__ == "__main__":
    main()
