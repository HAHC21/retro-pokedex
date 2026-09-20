from datetime import datetime

from pydantic import BaseModel

from app.domain.collection import CaughtPokemon


class CatchWrite(BaseModel):
    normal: bool
    shiny: bool


class CaughtPokemonRead(BaseModel):
    pokemon_id: int
    caught_at: datetime
    normal: bool
    shiny: bool

    @classmethod
    def from_domain(cls, entry: CaughtPokemon) -> "CaughtPokemonRead":
        return cls(
            pokemon_id=entry.pokemon_id,
            caught_at=entry.caught_at,
            normal=entry.normal,
            shiny=entry.shiny,
        )
