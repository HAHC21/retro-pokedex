from abc import ABC, abstractmethod

from app.domain.pokemon import Pokemon, PokemonPage
from app.domain.region import Region


class PokemonRepository(ABC):
    @abstractmethod
    async def list_ids(self, region: Region) -> list[int]:
        raise NotImplementedError

    @abstractmethod
    async def list_all(self, region: Region) -> PokemonPage:
        raise NotImplementedError

    @abstractmethod
    async def get_by_id(self, pokemon_id: int) -> Pokemon | None:
        raise NotImplementedError
