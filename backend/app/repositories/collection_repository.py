from abc import ABC, abstractmethod

from app.domain.collection import CaughtPokemon


class CollectionRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[CaughtPokemon]:
        raise NotImplementedError

    @abstractmethod
    def get(self, pokemon_id: int) -> CaughtPokemon | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, entry: CaughtPokemon) -> CaughtPokemon:
        raise NotImplementedError

    @abstractmethod
    def remove(self, pokemon_id: int) -> bool:
        raise NotImplementedError
