"""Fill Mongo ``pokeapi_cache`` with PokéAPI JSON for every National Dex species.

Skips paths that already have a row (TTL is ignored). Per species that is:

- ``pokemon/{id}``
- ``pokemon-species/{id}``
- ``pokemon/{id}/encounters``
- ``evolution-chain/{id}`` (deduped from species payloads)

Also warms the species list, types, and regional Pokédex list payloads.
Does **not** compile API working-set tables — run ``compile_poke_tables`` after
a full warm (or when derived schemas change). Re-sync PokéAPI only ~every
6 months or when a new game releases.

Usage (from backend/ with venv active and MONGODB_URI set):

    python -m scripts.sync_pokeapi
    python -m scripts.sync_pokeapi --start 1 --end 151
    python -m scripts.sync_pokeapi --id 25
    python -m scripts.sync_pokeapi --force
    python -m scripts.compile_poke_tables
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from collections.abc import Iterable
from pathlib import Path
from typing import Any

# Allow `python -m scripts.sync_pokeapi` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.catalog.type_matchups import ATTACKING_TYPES
from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import get_pokeapi_cache_repository, get_pokeapi_client, shutdown_external_clients
from app.integrations.pokeapi.client import PokeApiClient
from app.integrations.pokeapi.mapper import pokemon_id_from_url
from app.repositories.pokeapi_cache_repository import PokeApiCacheRepository
from app.services.poke_proxy_service import unique_regional_pokedex_names

DEFAULT_END = 1025
SPECIES_LIST_PARAMS = {"limit": DEFAULT_END, "offset": 0}
RETRY_WAIT_SECONDS = 30.0
MAX_ATTEMPTS = 5

Resource = tuple[str, dict[str, Any] | None]


def _catalog_resources() -> list[Resource]:
    resources: list[Resource] = [("pokemon-species", SPECIES_LIST_PARAMS)]
    resources.extend((f"type/{type_name}", None) for type_name in ATTACKING_TYPES)
    resources.extend((f"pokedex/{name}", None) for name in unique_regional_pokedex_names())
    return resources


def _pokemon_resources(pokemon_id: int) -> list[Resource]:
    return [
        (f"pokemon/{pokemon_id}", None),
        (f"pokemon-species/{pokemon_id}", None),
        (f"pokemon/{pokemon_id}/encounters", None),
    ]


def _chain_id_from_species(species: Any) -> int | None:
    if not isinstance(species, dict):
        return None
    url = (species.get("evolution_chain") or {}).get("url") or ""
    if not url:
        return None
    try:
        chain_id = pokemon_id_from_url(url)
    except (TypeError, ValueError):
        return None
    return chain_id or None


def _keys(client: PokeApiClient, resources: Iterable[Resource]) -> list[str]:
    return [client.cache_key(path, params) for path, params in resources]


async def _warm(
    client: PokeApiClient,
    path: str,
    params: dict[str, Any] | None,
    *,
    force: bool,
    delay_seconds: float,
) -> str:
    status = "error"
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            status = await client.cache_if_absent(path, params, force=force)
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


async def _warm_all(
    client: PokeApiClient,
    resources: list[Resource],
    *,
    force: bool,
    delay_seconds: float,
    counts: dict[str, int],
) -> None:
    for path, params in resources:
        status = await _warm(client, path, params, force=force, delay_seconds=delay_seconds)
        counts[status] = counts.get(status, 0) + 1


async def run(
    *,
    start: int,
    end: int,
    force: bool,
    delay_seconds: float,
    skip_catalog: bool,
) -> None:
    client = get_pokeapi_client()
    cache: PokeApiCacheRepository = get_pokeapi_cache_repository()
    ids = list(range(start, end + 1))
    catalog = [] if skip_catalog else _catalog_resources()
    pokemon_resources = [resource for pokemon_id in ids for resource in _pokemon_resources(pokemon_id)]
    planned = catalog + pokemon_resources

    existing = set() if force else cache.existing_paths(_keys(client, planned))
    missing = len(planned) - len(existing)
    print(f"Warming PokéAPI cache for #{start}–#{end} ({len(ids)} species).")
    print(f"Planned paths: {len(planned)}  already in Mongo: {len(existing)}  to fetch: {missing}")
    if not force:
        print("Existing rows are skipped (use --force to refetch).")

    counts = {"skip": 0, "fetched": 0, "missing": 0, "error": 0}

    if catalog:
        print("Catalog (species list, types, pokedexes)…")
        await _warm_all(client, catalog, force=force, delay_seconds=delay_seconds, counts=counts)

    print("Per-species pokemon / species / encounters…")
    for index, pokemon_id in enumerate(ids, start=1):
        resources = _pokemon_resources(pokemon_id)
        before = dict(counts)
        await _warm_all(client, resources, force=force, delay_seconds=delay_seconds, counts=counts)
        fetched_now = (counts.get("fetched", 0) - before.get("fetched", 0)) + (
            counts.get("missing", 0) - before.get("missing", 0)
        )
        skipped_now = counts.get("skip", 0) - before.get("skip", 0)
        errors_now = counts.get("error", 0) - before.get("error", 0)
        if fetched_now or errors_now or index == 1 or index == len(ids) or index % 50 == 0:
            print(
                f"[{index}/{len(ids)}] #{pokemon_id}  "
                f"fetched={fetched_now} skip={skipped_now} error={errors_now}"
            )

    print("Evolution chains…")
    chain_resources: list[Resource] = []
    seen_chains: set[int] = set()
    for pokemon_id in ids:
        species = await client.get_cached(f"pokemon-species/{pokemon_id}")
        chain_id = _chain_id_from_species(species)
        if chain_id is None or chain_id in seen_chains:
            continue
        seen_chains.add(chain_id)
        chain_resources.append((f"evolution-chain/{chain_id}", None))
    if not force:
        chain_existing = cache.existing_paths(_keys(client, chain_resources))
        print(
            f"Unique chains: {len(chain_resources)}  "
            f"already in Mongo: {len(chain_existing)}  "
            f"to fetch: {len(chain_resources) - len(chain_existing)}"
        )
    await _warm_all(client, chain_resources, force=force, delay_seconds=delay_seconds, counts=counts)

    print(
        "Done.",
        f"fetched={counts['fetched']}",
        f"skip={counts['skip']}",
        f"missing={counts['missing']}",
        f"error={counts['error']}",
        f"chains={len(chain_resources)}",
        "Next: python -m scripts.compile_poke_tables",
    )


async def _run(**kwargs) -> None:
    try:
        await run(**kwargs)
    finally:
        await shutdown_external_clients()


def main() -> None:
    parser = argparse.ArgumentParser(description="Populate Mongo pokeapi_cache from PokéAPI")
    parser.add_argument("--id", type=int, default=None, help="Warm a single National Dex id")
    parser.add_argument("--start", type=int, default=1, help="First National Dex id (inclusive)")
    parser.add_argument(
        "--end",
        type=int,
        default=DEFAULT_END,
        help=f"Last National Dex id (inclusive), default {DEFAULT_END}",
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
        "--skip-catalog",
        action="store_true",
        help="Do not warm species list, types, or pokedex payloads",
    )
    args = parser.parse_args()

    if args.id is not None:
        start = end = args.id
    else:
        start = max(1, args.start)
        end = max(start, args.end)

    connect_mongo()
    try:
        asyncio.run(
            _run(
                start=start,
                end=end,
                force=args.force,
                delay_seconds=max(0.0, args.delay),
                skip_catalog=args.skip_catalog,
            )
        )
    finally:
        disconnect_mongo()


if __name__ == "__main__":
    main()
