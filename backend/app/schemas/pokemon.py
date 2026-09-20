from typing import Self

from pydantic import BaseModel, Field

from app.domain.collection import CaughtPokemon
from app.domain.pokemon import Pokemon, TypeMatchup


class TypeMatchupRead(BaseModel):
    multiplier: float
    types: list[str]

    @classmethod
    def from_domain(cls, matchup: TypeMatchup) -> Self:
        return cls(multiplier=matchup.multiplier, types=matchup.types)


class PokemonStatRead(BaseModel):
    name: str
    base_stat: int


class PokemonSummary(BaseModel):
    id: int
    name: str
    types: list[str]
    sprite_url: str | None = None
    shiny_sprite_url: str | None = None
    caught: bool = False
    normal: bool = False
    shiny: bool = False

    @classmethod
    def from_domain(cls, pokemon: Pokemon, entry: CaughtPokemon | None) -> Self:
        return cls(
            id=pokemon.id,
            name=pokemon.name,
            types=pokemon.types,
            sprite_url=pokemon.sprite_url,
            shiny_sprite_url=pokemon.shiny_sprite_url,
            **_catch_fields(entry),
        )


class PokemonDetail(PokemonSummary):
    height: int | None = None
    weight: int | None = None
    description: str | None = None
    stats: list[PokemonStatRead] = Field(default_factory=list)
    type_matchups: list[TypeMatchupRead] = Field(default_factory=list)
    introduced_in: str | None = None
    games: list[str] = Field(default_factory=list)

    @classmethod
    def from_domain(cls, pokemon: Pokemon, entry: CaughtPokemon | None) -> Self:
        return cls(
            id=pokemon.id,
            name=pokemon.name,
            types=pokemon.types,
            sprite_url=pokemon.sprite_url,
            shiny_sprite_url=pokemon.shiny_sprite_url,
            height=pokemon.height,
            weight=pokemon.weight,
            description=pokemon.description,
            stats=[PokemonStatRead(name=stat.name, base_stat=stat.base_stat) for stat in pokemon.stats],
            type_matchups=[TypeMatchupRead.from_domain(matchup) for matchup in pokemon.type_matchups],
            introduced_in=pokemon.introduced_in,
            games=pokemon.games,
            **_catch_fields(entry),
        )


class PokemonListResponse(BaseModel):
    items: list[PokemonSummary]
    total: int
    region: str


def _catch_fields(entry: CaughtPokemon | None) -> dict[str, bool]:
    if entry is None or not entry.is_caught:
        return {"caught": False, "normal": False, "shiny": False}
    return {"caught": True, "normal": entry.normal, "shiny": entry.shiny}
