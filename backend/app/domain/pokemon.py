from dataclasses import dataclass, field


@dataclass(frozen=True)
class PokemonStat:
    name: str
    base_stat: int


@dataclass(frozen=True)
class TypeMatchup:
    multiplier: float
    types: list[str]


@dataclass(frozen=True)
class Pokemon:
    id: int
    name: str
    types: list[str] = field(default_factory=list)
    sprite_url: str | None = None
    shiny_sprite_url: str | None = None
    height: int | None = None
    weight: int | None = None
    description: str | None = None
    stats: list[PokemonStat] = field(default_factory=list)
    type_matchups: list[TypeMatchup] = field(default_factory=list)
    introduced_in: str | None = None
    games: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class PokemonPage:
    items: list[Pokemon]
    total: int
