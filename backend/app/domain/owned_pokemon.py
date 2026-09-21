"""Domain types for concrete owned Pokémon (future sav / PK imports)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class OwnedMove:
    slot: int
    move_id: int | None = None
    name: str | None = None
    pp: int | None = None
    pp_ups: int | None = None


@dataclass(frozen=True)
class StatBlock:
    hp: int | None = None
    attack: int | None = None
    defense: int | None = None
    special_attack: int | None = None
    special_defense: int | None = None
    speed: int | None = None


@dataclass(frozen=True)
class OwnedPokemon:
    owned_id: str
    user_id: str
    pokemon_id: int
    source_type: str
    created_at: datetime
    updated_at: datetime
    import_id: str | None = None
    raw_format: str | None = None
    raw_checksum: str | None = None
    species_slug: str | None = None
    form_slug: str | None = None
    nickname: str | None = None
    level: int | None = None
    experience: int | None = None
    gender: str | None = None
    shiny: bool = False
    ability_name: str | None = None
    ability_slot: int | None = None
    nature: str | None = None
    held_item: str | None = None
    friendship: int | None = None
    pokerus: bool = False
    ball: str | None = None
    fateful_encounter: bool = False
    egg_location: str | None = None
    moves: list[OwnedMove] = field(default_factory=list)
    ivs: StatBlock | None = None
    evs: StatBlock | None = None
    stats: StatBlock | None = None
    ot_name: str | None = None
    ot_id: str | None = None
    ot_gender: str | None = None
    language: str | None = None
    game_key: str | None = None
    met_game: str | None = None
    met_location: str | None = None
    met_level: int | None = None
    met_date: str | None = None
    is_party: bool = False
    box_index: int | None = None
    slot_index: int | None = None


@dataclass(frozen=True)
class PokemonImport:
    import_id: str
    user_id: str
    source_type: str
    filename: str
    status: str
    uploaded_at: datetime
    content_type: str | None = None
    size_bytes: int | None = None
    storage_key: str | None = None
    game_key: str | None = None
    generation: int | None = None
    format_hint: str | None = None
    error_message: str | None = None
    pokemon_count: int = 0
    parsed_at: datetime | None = None
