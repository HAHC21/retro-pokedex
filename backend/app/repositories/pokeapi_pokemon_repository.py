import asyncio
from typing import Any

from app.catalog.regions import is_exclusive_form
from app.domain.pokemon import Pokemon, PokemonPage
from app.domain.region import Region
from app.integrations.pokeapi.client import PokeApiClient
from app.integrations.pokeapi.mapper import (
    default_shiny_sprite_url,
    default_sprite_url,
    pokemon_from_payload,
    pokemon_id_from_url,
    type_names_from_payload,
)
from app.repositories.pokemon_repository import PokemonRepository

LIST_FETCH_CONCURRENCY = 20
ALL_POKEMON_LIMIT = 100_000


class PokeApiPokemonRepository(PokemonRepository):
    def __init__(self, client: PokeApiClient) -> None:
        self._client = client
        self._region_ids: dict[str, list[int]] = {}

    async def list_ids(self, region: Region) -> list[int]:
        return await self._ids_for_region(region)

    async def list_all(self, region: Region) -> PokemonPage:
        pokemon_ids = await self.list_ids(region)
        items = await self._hydrate(pokemon_ids)
        return PokemonPage(items=items, total=len(pokemon_ids))

    async def get_by_id(self, pokemon_id: int) -> Pokemon | None:
        payload = await self._client.get_pokemon(pokemon_id)
        if payload is None:
            return None
        species_name = (payload.get("species") or {}).get("name")
        species = await self._client.get_species(str(species_name)) if species_name else None
        type_payloads = await self._type_payloads(payload)
        return pokemon_from_payload(payload, species, type_payloads, detail=True)

    async def _type_payloads(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        names = type_names_from_payload(payload)
        if not names:
            return []
        results = await asyncio.gather(*[self._client.get_type(name) for name in names])
        return [result for result in results if result is not None]

    async def _ids_for_region(self, region: Region) -> list[int]:
        cached = self._region_ids.get(region.slug)
        if cached is not None:
            return cached

        ordered: list[int] = []
        seen: set[int] = set()
        excluded = set(region.excluded_species_ids)

        if region.generation is not None:
            generation = await self._client.get_generation(region.generation)
            species = generation.get("pokemon_species", []) if generation else []
            for species_id in sorted(pokemon_id_from_url(entry["url"]) for entry in species):
                if species_id in excluded or species_id in seen:
                    continue
                ordered.append(species_id)
                seen.add(species_id)

        for species_id in region.extra_species_ids:
            if species_id in seen:
                continue
            ordered.append(species_id)
            seen.add(species_id)

        if region.form_markers:
            listing = await self._client.list_pokemon(limit=ALL_POKEMON_LIMIT, offset=0)
            form_ids: list[int] = []
            for resource in listing.get("results") or []:
                name = resource.get("name", "")
                if not is_exclusive_form(name, region.form_markers):
                    continue
                pokemon_id = pokemon_id_from_url(resource["url"])
                if pokemon_id not in seen:
                    form_ids.append(pokemon_id)
                    seen.add(pokemon_id)
            ordered.extend(sorted(form_ids))

        self._region_ids[region.slug] = ordered
        return ordered

    async def _hydrate(self, pokemon_ids: list[int]) -> list[Pokemon]:
        semaphore = asyncio.Semaphore(LIST_FETCH_CONCURRENCY)

        async def fetch_pokemon(pokemon_id: int) -> dict[str, Any] | None:
            async with semaphore:
                return await self._client.get_pokemon(pokemon_id)

        payloads = await asyncio.gather(*[fetch_pokemon(pokemon_id) for pokemon_id in pokemon_ids])
        return [
            self._to_list_item(pokemon_id, payload) for pokemon_id, payload in zip(pokemon_ids, payloads)
        ]

    @staticmethod
    def _to_list_item(pokemon_id: int, payload: dict[str, Any] | None) -> Pokemon:
        if payload is not None:
            return pokemon_from_payload(payload)
        return Pokemon(
            id=pokemon_id,
            name=str(pokemon_id),
            sprite_url=default_sprite_url(pokemon_id),
            shiny_sprite_url=default_shiny_sprite_url(pokemon_id),
        )
