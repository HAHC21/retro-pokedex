"""Compile API working-set tables from existing Mongo ``pokeapi_cache``.

Does **not** call PokéAPI. Rebuilds:

- ``pokedex_entries`` (regional dex rows)
- ``pokemon_names``
- ``type_membership``
- ``obtain_index``
- ``location_meta``
- ``pokemon_evolution``
- ``pokemon_spawns``
- ``pokemon_acquisition``
- ``ability_effects``
- ``pokemon_detail_view``

Run after a warehouse warm (``sync_pokeapi``), or whenever derived schemas change.
PokéAPI itself should only be re-synced ~every 6 months or when a new game ships.

Note: ``location_meta`` only labels areas whose ``location-area`` / ``location`` payloads
already exist in ``pokeapi_cache``. Missing location rows yield null region/loc on spawns
until those cache paths are present.

Usage (from backend/ with venv active and MONGODB_URI set):

    python -m scripts.compile_poke_tables
    python -m scripts.compile_poke_tables --force
    python -m scripts.compile_poke_tables --limit 151
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# Allow `python -m scripts.compile_poke_tables` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import get_pokeapi_client, get_poke_proxy_service, shutdown_external_clients
from app.repositories.pokedex_entry_repository import PokedexEntryRepository
from app.services.poke_proxy_service import unique_regional_pokedex_names

DEFAULT_LIMIT = 1025


async def flatten_pokedexes(*, force: bool) -> tuple[int, int]:
    client = get_pokeapi_client()
    repo = PokedexEntryRepository()
    synced = 0
    skipped = 0
    for name in unique_regional_pokedex_names():
        if not force and repo.has_entries(name):
            skipped += 1
            continue
        payload = await client.get_cached(f"pokedex/{name}")
        if not isinstance(payload, dict):
            skipped += 1
            continue
        await asyncio.to_thread(repo.sync_from_payload, name, payload)
        synced += 1
        print(f"  flattened pokedex {name}")
    return synced, skipped


async def compile_tables(*, limit: int, force: bool) -> dict[str, int]:
    print(f"Compiling working-set tables from pokeapi_cache (limit={limit})…")
    print("Flattening regional Pokédex rows…")
    flattened, flatten_skipped = await flatten_pokedexes(force=force)

    service = get_poke_proxy_service()

    print("Compiling pokemon names…")
    name_map = await service.rebuild_name_index(limit=limit)

    print("Compiling type membership…")
    type_map = await service.rebuild_type_membership()

    print("Rebuilding slim obtain index…")
    obtain_payload = await service.rebuild_obtain_index(limit=limit)

    print("Compiling location meta…")
    location_count = await service.rebuild_location_meta(limit=limit)

    print("Compiling pokemon evolution…")
    evolution_count = await service.rebuild_pokemon_evolution(limit=limit)

    print("Compiling pokemon spawns…")
    spawns_count = await service.rebuild_pokemon_spawns(limit=limit)

    print("Compiling pokemon acquisition…")
    acquisition_count = await service.rebuild_pokemon_acquisition(limit=limit)

    print("Compiling ability effects…")
    ability_count = await service.rebuild_ability_effects(limit=limit)

    print("Compiling pokemon detail views…")
    detail_count = await service.rebuild_pokemon_detail_views(limit=limit)

    stats = {
        "pokedex_flattened": flattened,
        "pokedex_flatten_skipped": flatten_skipped,
        "names": len(name_map),
        "types": len(type_map),
        "obtain_versions": len(obtain_payload.get("versions") or {}),
        "obtain_parents": len(obtain_payload.get("evolves_from") or {}),
        "location_meta": location_count,
        "evolution": evolution_count,
        "spawns": spawns_count,
        "acquisition": acquisition_count,
        "ability_effects": ability_count,
        "detail_views": detail_count,
    }
    print(
        "Done.",
        " ".join(f"{key}={value}" for key, value in stats.items()),
    )
    return stats


async def _run(**kwargs) -> None:
    try:
        await compile_tables(**kwargs)
    finally:
        await shutdown_external_clients()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compile derived Mongo tables from pokeapi_cache (no PokéAPI calls)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"National Dex size to compile (default {DEFAULT_LIMIT})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild pokedex_entries even when rows already exist",
    )
    args = parser.parse_args()

    connect_mongo()
    try:
        asyncio.run(_run(limit=max(1, args.limit), force=args.force))
    finally:
        disconnect_mongo()


if __name__ == "__main__":
    main()
