"""Fetch the PokéAPI paths named by open data gaps, then compile those rows."""

from __future__ import annotations

import asyncio
import threading
from typing import Any

from app.catalog.type_matchups import ATTACKING_TYPES
from app.core.config import settings
from app.db.mongo import connect_mongo, disconnect_mongo
from app.integrations.pokeapi.client import PokeApiClient
from app.repositories.data_gap import (
    ACQUISITION,
    CATALOG_NAMES,
    DETAIL,
    FORM,
    LEARNSET,
    OBTAIN_INDEX,
    REGIONAL_DEX,
    SPAWNS,
    TYPE_MEMBERSHIP,
    DataGapRepository,
)
from app.repositories.obtain_index import ObtainIndexRepository
from app.repositories.pokedex_entry import PokedexEntryRepository
from app.repositories.pokeapi_cache import PokeApiCacheRepository
from app.repositories.pokemon_acquisition import PokemonAcquisitionRepository
from app.repositories.pokemon_detail_view import PokemonDetailViewRepository
from app.repositories.pokemon_form import PokemonRepository
from app.repositories.pokemon_learnset import PokemonLearnsetRepository
from app.repositories.pokemon_names import PokemonNamesRepository
from app.repositories.pokemon_spawns import PokemonSpawnsRepository
from app.repositories.type_membership import TypeMembershipRepository
from app.catalog.pokemon_form import stores_learnset
from scripts.poke_compile.compiler import PokeCompiler
from scripts.poke_compile.helpers import _id_from_url

_fill_lock = threading.Lock()


def _client() -> PokeApiClient:
    return PokeApiClient(
        base_url=settings.pokeapi_base_url,
        user_agent=settings.pokeapi_user_agent,
        cache=PokeApiCacheRepository(),
        ttl_seconds=settings.pokeapi_cache_ttl_seconds,
    )


async def fill_open_gaps() -> dict[str, Any]:
    """Fill open gaps. Returns immediately when none are open or a run is already going."""
    if not _fill_lock.acquire(blocking=False):
        print("gap fill already in progress")
        return {"status": "busy", "open": 0, "resolved": 0, "left": []}
    connect_mongo()
    client: PokeApiClient | None = None
    try:
        gaps = DataGapRepository().open_gaps()
        if not gaps:
            print("no open gaps")
            return {"status": "empty", "open": 0, "resolved": 0, "left": []}
        client = _client()
        compiler = PokeCompiler(client)
        if not await asyncio.to_thread(compiler._games.list_all):
            await asyncio.to_thread(compiler.seed_static_lists)
        resolved = 0
        left: list[dict[str, str]] = []
        for gap in gaps:
            if await _fill_one(client, compiler, gap):
                DataGapRepository().resolve(str(gap["kind"]), str(gap["subject"]))
                resolved += 1
            else:
                print(f"open gap {gap['kind']} {gap['subject']}")
                left.append({"kind": str(gap["kind"]), "subject": str(gap["subject"])})
        print(f"gap fill resolved={resolved} left={len(left)}")
        return {"status": "ok", "open": len(gaps), "resolved": resolved, "left": left}
    finally:
        if client is not None:
            await client.aclose()
        disconnect_mongo()
        _fill_lock.release()


async def _fill_one(client: PokeApiClient, compiler: PokeCompiler, gap: dict[str, Any]) -> bool:
    kind = str(gap["kind"])
    resource_id = gap.get("resource_id")
    game_key = gap.get("game_key")
    form = str(gap.get("form") or "")
    if kind == CATALOG_NAMES:
        await client.cache_if_absent("pokemon-species", {"limit": 1025, "offset": 0})
        names = await compiler.rebuild_name_index(limit=1025)
        return bool(names) or PokemonNamesRepository().count() > 0
    if kind == TYPE_MEMBERSHIP:
        for name in ATTACKING_TYPES:
            await client.cache_if_absent(f"type/{name}")
        compiled = await compiler.rebuild_type_membership()
        return TypeMembershipRepository().get_all(ATTACKING_TYPES) is not None and len(compiled) > 0
    if kind == REGIONAL_DEX:
        return await _fill_regional(client, compiler, str(game_key or gap["subject"]))
    if kind == DETAIL and resource_id:
        return await _fill_detail(client, compiler, int(resource_id))
    if kind == SPAWNS and resource_id:
        await client.cache_if_absent(f"pokemon/{int(resource_id)}/encounters")
        await compiler.compile_spawns_for([int(resource_id)])
        record = PokemonRepository().get_by_resource_id(int(resource_id))
        if record is None:
            return False
        return PokemonSpawnsRepository().get(int(record.pokedex_id), str(record.form or "base")) is not None
    if kind == LEARNSET and resource_id:
        if form and not stores_learnset(form):
            return True
        await client.cache_if_absent(f"pokemon/{int(resource_id)}")
        key = str(game_key or "home")
        await compiler.compile_learnsets([int(resource_id)], key)
        return PokemonLearnsetRepository().get(int(resource_id), key) is not None
    if kind == OBTAIN_INDEX:
        await compiler.rebuild_obtain_index(limit=1025)
        return ObtainIndexRepository().get(min_count=1) is not None
    if kind == ACQUISITION and resource_id and game_key:
        await client.cache_if_absent(f"pokemon/{int(resource_id)}/encounters")
        await compiler.compile_acquisition_for([int(resource_id)])
        return PokemonAcquisitionRepository().get(int(resource_id), str(game_key)) is not None
    if kind == FORM:
        if resource_id is None:
            return False
        return PokemonRepository().get_by_resource_id(int(resource_id)) is not None
    return False


async def _fill_regional(client: PokeApiClient, compiler: PokeCompiler, game_key: str) -> bool:
    game = compiler._games.get(game_key)
    if game is None:
        return False
    repo = PokedexEntryRepository()
    for name in game["pokedexes"]:
        await client.cache_if_absent(f"pokedex/{name}")
        if repo.has_entries(name):
            continue
        payload = await client.get_cached(f"pokedex/{name}")
        if isinstance(payload, dict):
            repo.sync_from_payload(name, payload)
    return all(repo.has_entries(name) for name in game["pokedexes"])


async def _fill_detail(client: PokeApiClient, compiler: PokeCompiler, resource_id: int) -> bool:
    await client.cache_if_absent(f"pokemon/{resource_id}")
    raw = await client.get_cached(f"pokemon/{resource_id}")
    species_id = resource_id
    if isinstance(raw, dict) and isinstance(raw.get("species"), dict):
        species_id = _id_from_url(str((raw.get("species") or {}).get("url") or "")) or resource_id
    await client.cache_if_absent(f"pokemon-species/{species_id}")
    await client.cache_if_absent(f"pokemon/{resource_id}/encounters")
    await compiler.compile_detail_views([resource_id])
    record = PokemonRepository().get_by_resource_id(resource_id)
    if record is None:
        return False
    stored = PokemonDetailViewRepository().get(int(record.pokedex_id), str(record.form or "base"))
    return stored is not None and "games" in stored
