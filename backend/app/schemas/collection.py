from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.domain.collection import CaughtPokemon
from app.domain.owned_pokemon import OwnedPokemon


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


class MarkEntryWrite(BaseModel):
    caught: bool = False
    caughtAt: int | None = None
    shiny: bool = False
    shinyAt: int | None = None


class MarkEntryRead(BaseModel):
    game: str
    pokemon_id: int
    mark: dict[str, Any] | None = None


class ProgressRead(BaseModel):
    progress: dict[str, dict[str, dict[str, Any]]] = Field(default_factory=dict)


class ProgressWrite(BaseModel):
    progress: dict[str, dict[str, dict[str, Any]]] = Field(default_factory=dict)
    mode: str = "merge"  # merge | replace


class StatBlockWrite(BaseModel):
    hp: int | None = None
    attack: int | None = None
    defense: int | None = None
    special_attack: int | None = None
    special_defense: int | None = None
    speed: int | None = None


class OwnedMoveWrite(BaseModel):
    slot: int = 0
    move_id: int | None = None
    name: str | None = None
    pp: int | None = None
    pp_ups: int | None = None


def _stat_write(block: Any) -> StatBlockWrite | None:
    if block is None:
        return None
    return StatBlockWrite(
        hp=block.hp,
        attack=block.attack,
        defense=block.defense,
        special_attack=block.special_attack,
        special_defense=block.special_defense,
        speed=block.speed,
    )


class OwnedPokemonWrite(BaseModel):
    pokemon_id: int = Field(ge=1)
    game_key: str | None = None
    nickname: str | None = Field(default=None, max_length=40)
    level: int | None = Field(default=None, ge=1, le=100)
    gender: str | None = None
    shiny: bool = False
    ability_name: str | None = None
    ability_slot: int | None = None
    nature: str | None = None
    held_item: str | None = None
    species_slug: str | None = None
    source_type: str | None = None
    raw_format: str | None = None
    filename: str | None = None
    ot_name: str | None = None
    ball: str | None = None
    met_game: str | None = None
    met_location: str | None = None
    met_level: int | None = Field(default=None, ge=0)
    met_date: str | None = None
    fateful_encounter: bool = False
    egg_location: str | None = None
    moves: list[OwnedMoveWrite] = Field(default_factory=list)
    ivs: StatBlockWrite | None = None
    evs: StatBlockWrite | None = None
    stats: StatBlockWrite | None = None


class OwnedPokemonUpdate(BaseModel):
    game_key: str | None = None
    nickname: str | None = Field(default=None, max_length=40)
    level: int | None = Field(default=None, ge=1, le=100)
    gender: str | None = None
    shiny: bool | None = None
    ability_name: str | None = None
    ability_slot: int | None = None
    nature: str | None = None
    held_item: str | None = None
    species_slug: str | None = None
    moves: list[OwnedMoveWrite] | None = None
    ivs: StatBlockWrite | None = None
    evs: StatBlockWrite | None = None
    stats: StatBlockWrite | None = None


class OwnedPokemonRead(BaseModel):
    owned_id: str
    pokemon_id: int
    game_key: str | None = None
    nickname: str | None = None
    level: int | None = None
    gender: str | None = None
    shiny: bool = False
    ability_name: str | None = None
    ability_slot: int | None = None
    nature: str | None = None
    held_item: str | None = None
    species_slug: str | None = None
    source_type: str = "manual"
    raw_format: str | None = None
    ot_name: str | None = None
    ball: str | None = None
    met_game: str | None = None
    met_location: str | None = None
    met_level: int | None = None
    met_date: str | None = None
    fateful_encounter: bool = False
    egg_location: str | None = None
    moves: list[OwnedMoveWrite] = Field(default_factory=list)
    ivs: StatBlockWrite | None = None
    evs: StatBlockWrite | None = None
    stats: StatBlockWrite | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, entry: OwnedPokemon) -> "OwnedPokemonRead":
        return cls(
            owned_id=entry.owned_id,
            pokemon_id=entry.pokemon_id,
            game_key=entry.game_key,
            nickname=entry.nickname,
            level=entry.level,
            gender=entry.gender,
            shiny=entry.shiny,
            ability_name=entry.ability_name,
            ability_slot=entry.ability_slot,
            nature=entry.nature,
            held_item=entry.held_item,
            species_slug=entry.species_slug,
            source_type=entry.source_type,
            raw_format=entry.raw_format,
            ot_name=entry.ot_name,
            ball=entry.ball,
            met_game=entry.met_game,
            met_location=entry.met_location,
            met_level=entry.met_level,
            met_date=entry.met_date,
            fateful_encounter=bool(entry.fateful_encounter),
            egg_location=entry.egg_location,
            moves=[
                OwnedMoveWrite(
                    slot=move.slot,
                    move_id=move.move_id,
                    name=move.name,
                    pp=move.pp,
                    pp_ups=move.pp_ups,
                )
                for move in entry.moves
            ],
            ivs=_stat_write(entry.ivs),
            evs=_stat_write(entry.evs),
            stats=_stat_write(entry.stats),
            created_at=entry.created_at,
            updated_at=entry.updated_at,
        )


class OwnedPokemonListRead(BaseModel):
    items: list[OwnedPokemonRead] = Field(default_factory=list)
    collected_abilities: list[str] = Field(default_factory=list)
    collected_natures: list[str] = Field(default_factory=list)


class OwnedPokemonBatchWrite(BaseModel):
    items: list[dict[str, Any]] = Field(min_length=1, max_length=2000)
    filename: str | None = None


class OwnedPokemonBatchError(BaseModel):
    index: int
    filename: str | None = None
    error: str


class OwnedPokemonBatchRead(BaseModel):
    import_id: str
    saved: int
    failed: int
    errors: list[OwnedPokemonBatchError] = Field(default_factory=list)
