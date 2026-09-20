from datetime import datetime, timezone

import asyncio

from app.catalog.regions import all_regions, get_region
from app.domain.collection import CaughtPokemon
from app.repositories.collection_repository import CollectionRepository
from app.repositories.pokemon_repository import PokemonRepository
from app.schemas.collection import CatchWrite, CaughtPokemonRead
from app.schemas.pokemon import PokemonDetail, PokemonListResponse, PokemonSummary
from app.schemas.region import DashboardRead, RegionProgressRead, RegionRead


class PokemonNotFoundError(LookupError):
    pass


class RegionNotFoundError(LookupError):
    pass


class PokemonService:
    def __init__(
        self,
        pokemon_repository: PokemonRepository,
        collection_repository: CollectionRepository,
    ) -> None:
        self._pokemon_repository = pokemon_repository
        self._collection_repository = collection_repository

    def list_regions(self) -> list[RegionRead]:
        return [RegionRead.from_domain(region) for region in all_regions()]

    async def get_dashboard(self) -> DashboardRead:
        caught_ids = {entry.pokemon_id for entry in self._collection_repository.list_all() if entry.is_caught}
        regions = all_regions()
        id_lists = await asyncio.gather(*[self._pokemon_repository.list_ids(region) for region in regions])
        catalog: set[int] = set()
        progress: list[RegionProgressRead] = []
        for region, pokemon_ids in zip(regions, id_lists):
            region_ids = set(pokemon_ids)
            catalog.update(region_ids)
            progress.append(
                RegionProgressRead(
                    slug=region.slug,
                    name=region.name,
                    subtitle=region.subtitle,
                    total=len(pokemon_ids),
                    caught=len(region_ids & caught_ids),
                )
            )
        return DashboardRead(
            caught=len(catalog & caught_ids),
            total=len(catalog),
            regions=progress,
        )

    async def list_pokemon(self, region_slug: str) -> PokemonListResponse:
        region = get_region(region_slug)
        if region is None:
            raise RegionNotFoundError(region_slug)
        page = await self._pokemon_repository.list_all(region)
        caught_by_id = {entry.pokemon_id: entry for entry in self._collection_repository.list_all()}
        return PokemonListResponse(
            items=[PokemonSummary.from_domain(pokemon, caught_by_id.get(pokemon.id)) for pokemon in page.items],
            total=page.total,
            region=region.slug,
        )

    async def get_pokemon(self, pokemon_id: int) -> PokemonDetail:
        pokemon = await self._pokemon_repository.get_by_id(pokemon_id)
        if pokemon is None:
            raise PokemonNotFoundError(pokemon_id)
        return PokemonDetail.from_domain(pokemon, self._collection_repository.get(pokemon_id))


class CollectionService:
    def __init__(
        self,
        pokemon_repository: PokemonRepository,
        collection_repository: CollectionRepository,
    ) -> None:
        self._pokemon_repository = pokemon_repository
        self._collection_repository = collection_repository

    def list_caught(self) -> list[CaughtPokemonRead]:
        return [CaughtPokemonRead.from_domain(entry) for entry in self._collection_repository.list_all()]

    async def set_caught(self, pokemon_id: int, payload: CatchWrite) -> CaughtPokemonRead | None:
        if await self._pokemon_repository.get_by_id(pokemon_id) is None:
            raise PokemonNotFoundError(pokemon_id)
        if not payload.normal and not payload.shiny:
            self._collection_repository.remove(pokemon_id)
            return None
        existing = self._collection_repository.get(pokemon_id)
        entry = self._collection_repository.save(
            CaughtPokemon(
                pokemon_id=pokemon_id,
                caught_at=existing.caught_at if existing else datetime.now(timezone.utc),
                normal=payload.normal,
                shiny=payload.shiny,
            )
        )
        return CaughtPokemonRead.from_domain(entry)
