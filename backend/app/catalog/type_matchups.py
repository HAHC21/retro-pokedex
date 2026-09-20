from collections.abc import Mapping, Sequence
from typing import Any

from app.domain.pokemon import TypeMatchup

ATTACKING_TYPES = (
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
)

_MATCHUP_ORDER = (4.0, 2.0, 0.5, 0.25, 0.0)


def defensive_matchups(relations_list: Sequence[Mapping[str, Any]]) -> list[TypeMatchup]:
    grouped: dict[float, list[str]] = {multiplier: [] for multiplier in _MATCHUP_ORDER}
    for attacking in ATTACKING_TYPES:
        multiplier = 1.0
        for relations in relations_list:
            multiplier *= _incoming_multiplier(attacking, relations)
        if multiplier in grouped:
            grouped[multiplier].append(attacking)
    return [
        TypeMatchup(multiplier=multiplier, types=types)
        for multiplier, types in grouped.items()
        if types
    ]


def _incoming_multiplier(attacking: str, relations: Mapping[str, Any]) -> float:
    if attacking in _named(relations.get("no_damage_from")):
        return 0.0
    if attacking in _named(relations.get("double_damage_from")):
        return 2.0
    if attacking in _named(relations.get("half_damage_from")):
        return 0.5
    return 1.0


def _named(entries: Any) -> set[str]:
    return {item["name"] for item in entries or [] if item.get("name")}
