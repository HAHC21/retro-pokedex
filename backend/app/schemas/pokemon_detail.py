"""Species page."""

from app.schemas.base import OpenModel


class NamedRead(OpenModel):
    name: str


class TypeSlotRead(OpenModel):
    type: NamedRead


class AbilityRefRead(OpenModel):
    name: str
    url: str | None = None


class AbilitySlotRead(OpenModel):
    ability: AbilityRefRead
    is_hidden: bool | None = None
    slot: int | None = None
    description: str | None = None


class StatSlotRead(OpenModel):
    base_stat: int
    stat: NamedRead


class GameIndexRead(OpenModel):
    version: NamedRead


class SpeciesRefRead(OpenModel):
    url: str = ""


class FormRefRead(OpenModel):
    name: str
    url: str | None = None


class PokemonDataRead(OpenModel):
    id: int
    name: str
    height: int = 0
    weight: int = 0
    types: list[TypeSlotRead] = []
    abilities: list[AbilitySlotRead] = []
    stats: list[StatSlotRead] = []
    game_indices: list[GameIndexRead] = []
    species: SpeciesRefRead | None = None
    forms: list[FormRefRead] = []


class LanguageRead(OpenModel):
    name: str


class SpeciesNameRead(OpenModel):
    name: str
    language: LanguageRead


class VarietyPokemonRead(OpenModel):
    name: str
    url: str | None = None


class VarietyRead(OpenModel):
    is_default: bool = False
    pokemon: VarietyPokemonRead


class FlavorTextRead(OpenModel):
    flavor_text: str | None = None
    language: LanguageRead
    version: NamedRead | None = None


class EvolutionChainRead(OpenModel):
    url: str | None = None


class SpeciesRead(OpenModel):
    name: str | None = None
    names: list[SpeciesNameRead] = []
    varieties: list[VarietyRead] = []
    evolution_chain: EvolutionChainRead | None = None
    flavor_text_entries: list[FlavorTextRead] = []


class EvolutionStepRead(OpenModel):
    id: int
    name: str
    cond: str = ""


class OverviewRead(OpenModel):
    en: str | None = None
    es: str | None = None


class GameAvailabilityRead(OpenModel):
    version: str
    ways: list[str] = []


class PokemonDetailRead(OpenModel):
    data: PokemonDataRead
    species: SpeciesRead
    evo: list[EvolutionStepRead] = []
    obtain_versions: list[str] = []
    evolves_from: int | None = None
    overview: OverviewRead | str | None = None
    capture: bool = True
    games: list[GameAvailabilityRead] = []
