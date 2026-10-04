"""National Dex catalog, form list, and regional dex. Reads stored rows only."""

from __future__ import annotations

import asyncio
from typing import Any

from app.catalog.type_matchups import ATTACKING_TYPES
from app.repositories.data_gap import CATALOG_NAMES, REGIONAL_DEX, TYPE_MEMBERSHIP, DataGapRepository
from app.repositories.generation import GenerationRepository
from app.repositories.pokedex_entry import PokedexEntryRepository
from app.repositories.pokemon_form import PokemonRepository
from app.repositories.pokemon_names import PokemonNamesRepository
from app.repositories.region import RegionRepository
from app.repositories.type_membership import TypeMembershipRepository
from app.repositories.game import GameRepository


class CatalogService:
    def __init__(self) -> None:
        self._names = PokemonNamesRepository()
        self._types = TypeMembershipRepository()
        self._pokemon = PokemonRepository()
        self._generations = GenerationRepository()
        self._regions = RegionRepository()
        self._games = GameRepository()
        self._pokedex_entries = PokedexEntryRepository()
        self._gaps = DataGapRepository()

    async def catalog(self, *, limit: int = 1025) -> dict[str, Any]:
        names = await asyncio.to_thread(self._names.get, min_count=1)
        if not names:
            await asyncio.to_thread(self._gaps.record, CATALOG_NAMES, "catalog")
            names = {}
        membership = await asyncio.to_thread(self._types.get_all, ATTACKING_TYPES)
        types_by_id: dict[str, list[str]] = {}
        if membership is None:
            await asyncio.to_thread(self._gaps.record, TYPE_MEMBERSHIP, "types")
        else:
            for type_name, pokemon_ids in membership.items():
                for pokemon_id in pokemon_ids:
                    if 1 <= int(pokemon_id) <= limit:
                        types_by_id.setdefault(str(pokemon_id), []).append(type_name)
        groups = await asyncio.to_thread(self._pokemon.rarity_groups)
        generations = await asyncio.to_thread(self._generations.list_payload)
        regions = await asyncio.to_thread(self._regions.list_payload)
        return {
            "names": names,
            "types": types_by_id,
            "legendaries": groups["legendary"],
            "mythicals": groups["mythical"],
            "pseudos": groups["pseudo"],
            "fossils": groups["fossil"],
            "starters": groups["starter"],
            "count": limit,
            "generations": generations,
            "regions": regions,
        }

    async def alternate_forms(self) -> dict[str, Any]:
        forms = await asyncio.to_thread(self._pokemon.list_alternate_forms)
        return {"forms": forms}

    async def regional_dex(self, game_key: str) -> dict[str, Any]:
        game = await asyncio.to_thread(self._games.get, game_key)
        if game is None:
            raise KeyError(game_key)
        names = list(game["pokedexes"])
        ready = True
        for dex_name in names:
            has_rows = await asyncio.to_thread(self._pokedex_entries.has_entries, dex_name)
            if not has_rows:
                ready = False
                break
        if not ready:
            await asyncio.to_thread(
                self._gaps.record,
                REGIONAL_DEX,
                game_key,
                game_key=game_key,
            )
            return {"game": game_key, "entries": [], "ids": []}
        entries = await asyncio.to_thread(self._pokedex_entries.aggregate_regional, names)
        return {
            "game": game_key,
            "entries": entries,
            "ids": [int(item["id"]) for item in entries],
        }
