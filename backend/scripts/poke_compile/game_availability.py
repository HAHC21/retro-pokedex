"""Which games a species or form can be met in, and how.

Pokédex membership comes from regional Pokédex resources, not flavor text.
Encounter methods come from that Pokémon's own encounter list, so Alolan
Meowth does not inherit Kanto Meowth's games. Mega Evolution and Gigantamax
list only the games where that mechanic exists for the species.
"""

from __future__ import annotations

import re
from typing import Any

# Regional Pokédex slug → version names that dex actually covers.
# DLC dexes keep the DLC versions, so Isle of Armor is not also Sword/Shield.
POKEDEX_VERSIONS: dict[str, tuple[str, ...]] = {
    "kanto": ("red", "blue", "yellow", "firered", "leafgreen"),
    "original-johto": ("gold", "silver", "crystal"),
    "hoenn": ("ruby", "sapphire", "emerald"),
    "original-sinnoh": ("diamond", "pearl", "brilliant-diamond", "shining-pearl"),
    "extended-sinnoh": ("platinum",),
    "updated-johto": ("heartgold", "soulsilver"),
    "original-unova": ("black", "white"),
    "updated-unova": ("black-2", "white-2"),
    "kalos-central": ("x", "y"),
    "kalos-coastal": ("x", "y"),
    "kalos-mountain": ("x", "y"),
    "updated-hoenn": ("omega-ruby", "alpha-sapphire"),
    "original-alola": ("sun", "moon"),
    "updated-alola": ("ultra-sun", "ultra-moon"),
    "letsgo-kanto": ("lets-go-pikachu", "lets-go-eevee"),
    "galar": ("sword", "shield"),
    "isle-of-armor": ("the-isle-of-armor-sword", "the-isle-of-armor-shield"),
    "crown-tundra": ("the-crown-tundra-sword", "the-crown-tundra-shield"),
    "hisui": ("legends-arceus",),
    "paldea": ("scarlet", "violet"),
    "kitakami": ("the-teal-mask-scarlet", "the-teal-mask-violet"),
    "blueberry": ("the-indigo-disk-scarlet", "the-indigo-disk-violet"),
    "lumiose-city": ("legends-za",),
    "hyperspace": ("mega-dimension",),
}

# Version group on a Mega Pokémon's learnset → the pair of versions.
MOVE_GROUP_VERSIONS: dict[str, tuple[str, ...]] = {
    "x-y": ("x", "y"),
    "omega-ruby-alpha-sapphire": ("omega-ruby", "alpha-sapphire"),
    "sun-moon": ("sun", "moon"),
    "ultra-sun-ultra-moon": ("ultra-sun", "ultra-moon"),
    "lets-go-pikachu-lets-go-eevee": ("lets-go-pikachu", "lets-go-eevee"),
    "legends-za": ("legends-za",),
    "mega-dimension": ("mega-dimension",),
}

MEGA_VERSIONS = frozenset(version for versions in MOVE_GROUP_VERSIONS.values() for version in versions)
GMAX_VERSIONS = frozenset(
    POKEDEX_VERSIONS["galar"] + POKEDEX_VERSIONS["isle-of-armor"] + POKEDEX_VERSIONS["crown-tundra"]
)
# These stay on the species dex even when a Mega's learnset has not caught up.
MEGA_DEX_VERSIONS = frozenset({"legends-za", "mega-dimension"})

# Keep in step with frontend EVENT_OBTAINABLE_BY_GAME.
EVENT_SPECIES_BY_GAME: dict[str, tuple[int, ...]] = {
    "rb": (151,),
    "y": (151,),
    "gs": (251,),
    "c": (251,),
    "rs": (385, 386),
    "e": (385, 386),
    "frlg": (151, 385, 386),
    "dp": (489, 490, 491, 492, 493),
    "pt": (489, 490, 491, 492, 493),
    "hgss": (251, 489, 490, 491, 492, 493),
    "bw": (494, 647, 648, 649),
    "b2w2": (494, 647, 648, 649),
    "xy": (719, 720, 721),
    "oras": (719, 720, 721),
    "sm": (801, 802, 807),
    "usum": (801, 802, 807, 808, 809),
    "swsh": (808, 809, 893),
    "bdsp": (489, 490, 491, 492, 493),
    "sv": (1025,),
}

GAME_VERSION_NAMES: dict[str, tuple[str, ...]] = {
    "rb": ("red", "blue"),
    "y": ("yellow",),
    "gs": ("gold", "silver"),
    "c": ("crystal",),
    "rs": ("ruby", "sapphire"),
    "e": ("emerald",),
    "frlg": ("firered", "leafgreen"),
    "dp": ("diamond", "pearl"),
    "pt": ("platinum",),
    "hgss": ("heartgold", "soulsilver"),
    "bw": ("black", "white"),
    "b2w2": ("black-2", "white-2"),
    "xy": ("x", "y"),
    "oras": ("omega-ruby", "alpha-sapphire"),
    "sm": ("sun", "moon"),
    "usum": ("ultra-sun", "ultra-moon"),
    "swsh": ("sword", "shield"),
    "bdsp": ("brilliant-diamond", "shining-pearl"),
    "pla": ("legends-arceus",),
    "sv": ("scarlet", "violet"),
}

WAY_ORDER = ("wild", "starter", "gift", "static", "trade", "snag", "event", "pokedex", "mega", "gigantamax")

VERSION_ORDER = (
    "red",
    "blue",
    "yellow",
    "gold",
    "silver",
    "crystal",
    "ruby",
    "sapphire",
    "emerald",
    "firered",
    "leafgreen",
    "colosseum",
    "xd",
    "diamond",
    "pearl",
    "platinum",
    "heartgold",
    "soulsilver",
    "black",
    "white",
    "black-2",
    "white-2",
    "x",
    "y",
    "omega-ruby",
    "alpha-sapphire",
    "sun",
    "moon",
    "ultra-sun",
    "ultra-moon",
    "lets-go-pikachu",
    "lets-go-eevee",
    "sword",
    "shield",
    "the-isle-of-armor-sword",
    "the-isle-of-armor-shield",
    "the-crown-tundra-sword",
    "the-crown-tundra-shield",
    "brilliant-diamond",
    "shining-pearl",
    "legends-arceus",
    "scarlet",
    "violet",
    "the-teal-mask-scarlet",
    "the-teal-mask-violet",
    "the-indigo-disk-scarlet",
    "the-indigo-disk-violet",
    "legends-za",
    "mega-dimension",
)

_VERSION_RANK = {name: index for index, name in enumerate(VERSION_ORDER)}
_TRADE = re.compile(r"trade")
_STARTER = re.compile(r"starter")
_GIFT = re.compile(r"gift")
_STATIC = re.compile(r"only-one")
_SNAG = re.compile(r"snag")


def encounter_way(method_name: str) -> str:
    name = method_name or ""
    if _TRADE.search(name):
        return "trade"
    if _STARTER.search(name):
        return "starter"
    if _GIFT.search(name):
        return "gift"
    if _STATIC.search(name):
        return "static"
    if _SNAG.search(name):
        return "snag"
    return "wild"


def ways_by_version(encounters: list[dict[str, Any]] | None) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for entry in encounters or []:
        area = (entry.get("location_area") or {}).get("name") or ""
        if re.search(r"pokecenter|poke-center", area):
            continue
        for detail in entry.get("version_details") or []:
            version = (detail.get("version") or {}).get("name") or ""
            if not version:
                continue
            for item in detail.get("encounter_details") or []:
                way = encounter_way((item.get("method") or {}).get("name") or "")
                found.setdefault(version, set()).add(way)
    return found


def versions_in_pokedexes(pokedex_names: list[str]) -> set[str]:
    versions: set[str] = set()
    for name in pokedex_names:
        versions.update(POKEDEX_VERSIONS.get(name, ()))
    return versions


def event_versions_for_species(species_id: int) -> set[str]:
    versions: set[str] = set()
    for game_key, species_ids in EVENT_SPECIES_BY_GAME.items():
        if species_id not in species_ids:
            continue
        versions.update(GAME_VERSION_NAMES.get(game_key, ()))
    return versions


def mechanic_versions_from_moves(moves: list[dict[str, Any]] | None, *, kind: str) -> set[str]:
    """Games where a Mega or Gigantamax form's learnset says the mechanic exists."""
    if kind != "mega":
        return set()
    versions: set[str] = set()
    for move in moves or []:
        for detail in move.get("version_group_details") or []:
            group = (detail.get("version_group") or {}).get("name") or ""
            for version in MOVE_GROUP_VERSIONS.get(group, ()):
                if version in MEGA_VERSIONS:
                    versions.add(version)
    return versions


def is_mechanic_form(form: str) -> bool:
    key = (form or "").strip().lower()
    return key == "gigantamax" or key == "mega" or key.startswith("mega-")


def is_mechanic_variety(slug: str) -> bool:
    name = (slug or "").lower()
    return "-mega" in name or name.endswith("-gmax")


def availability_rows(
    *,
    form: str,
    encounter_ways: dict[str, set[str]],
    pokedex_versions: set[str],
    claimed_versions: set[str],
    event_versions: set[str],
    mechanic_versions: set[str] | None = None,
) -> list[dict[str, Any]]:
    """One row per version, with the ways that version applies to this form."""
    if mechanic_versions is not None:
        way = "gigantamax" if form == "gigantamax" else "mega"
        return [_row(version, {way}) for version in _sorted(mechanic_versions)]

    if form == "base":
        pokedex_for_form = pokedex_versions - claimed_versions
        events_for_form = event_versions
    else:
        encountered = set(encounter_ways)
        pokedex_for_form = pokedex_versions & encountered
        events_for_form = set()

    versions = set(encounter_ways) | pokedex_for_form | events_for_form
    rows: list[dict[str, Any]] = []
    for version in _sorted(versions):
        ways = set(encounter_ways.get(version, ()))
        if version in events_for_form:
            ways.add("event")
        if version in pokedex_for_form:
            ways.add("pokedex")
        if ways:
            rows.append(_row(version, ways))
    return rows


def _row(version: str, ways: set[str]) -> dict[str, Any]:
    ordered = [way for way in WAY_ORDER if way in ways]
    extras = sorted(way for way in ways if way not in WAY_ORDER)
    return {"version": version, "ways": ordered + extras}


def _sorted(versions: set[str]) -> list[str]:
    return sorted(versions, key=lambda name: (_VERSION_RANK.get(name, 10_000), name))
