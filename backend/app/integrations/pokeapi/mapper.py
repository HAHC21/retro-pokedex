from typing import Any

from app.catalog.games import display_generation, labeled_version_groups
from app.catalog.type_matchups import defensive_matchups
from app.domain.pokemon import Pokemon, PokemonStat, TypeMatchup

SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon"


def pokemon_id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1])


def default_sprite_url(pokemon_id: int) -> str:
    return f"{SPRITE_BASE}/{pokemon_id}.png"


def default_shiny_sprite_url(pokemon_id: int) -> str:
    return f"{SPRITE_BASE}/shiny/{pokemon_id}.png"


def pokemon_from_payload(
    payload: dict[str, Any],
    species: dict[str, Any] | None = None,
    type_payloads: list[dict[str, Any]] | None = None,
    *,
    detail: bool = False,
) -> Pokemon:
    pokemon_id = int(payload["id"])
    return Pokemon(
        id=pokemon_id,
        name=payload["name"],
        types=type_names_from_payload(payload),
        sprite_url=_sprite_url(payload) or default_sprite_url(pokemon_id),
        shiny_sprite_url=_sprite_url(payload, shiny=True) or default_shiny_sprite_url(pokemon_id),
        height=payload.get("height"),
        weight=payload.get("weight"),
        description=_english_flavor_text(species),
        stats=_stats(payload),
        type_matchups=_type_matchups(type_payloads) if detail else [],
        introduced_in=display_generation(_generation_slug(species)) if detail else None,
        games=labeled_version_groups(_version_group_slugs(payload)) if detail else [],
    )


def type_names_from_payload(payload: dict[str, Any]) -> list[str]:
    slots = sorted(payload.get("types", []), key=lambda item: item.get("slot", 0))
    return [item["type"]["name"] for item in slots if item.get("type")]


def _stats(payload: dict[str, Any]) -> list[PokemonStat]:
    return [
        PokemonStat(name=item["stat"]["name"], base_stat=int(item["base_stat"]))
        for item in payload.get("stats", [])
        if item.get("stat") is not None and item.get("base_stat") is not None
    ]


def _sprite_url(payload: dict[str, Any], shiny: bool = False) -> str | None:
    sprites = payload.get("sprites") or {}
    other = sprites.get("other") or {}
    artwork = other.get("official-artwork") or {}
    if shiny:
        return artwork.get("front_shiny") or sprites.get("front_shiny")
    return artwork.get("front_default") or sprites.get("front_default")


def _english_flavor_text(species: dict[str, Any] | None) -> str | None:
    if species is None:
        return None
    for entry in species.get("flavor_text_entries", []):
        language = entry.get("language") or {}
        if language.get("name") == "en":
            return " ".join(str(entry.get("flavor_text", "")).split()) or None
    return None


def _generation_slug(species: dict[str, Any] | None) -> str | None:
    if species is None:
        return None
    generation = species.get("generation") or {}
    return generation.get("name")


def _version_group_slugs(payload: dict[str, Any]) -> list[str]:
    order: dict[str, int] = {}
    for move in payload.get("moves") or []:
        for detail in move.get("version_group_details") or []:
            group = detail.get("version_group") or {}
            name = group.get("name")
            if not name or name in order:
                continue
            url = group.get("url") or ""
            order[name] = pokemon_id_from_url(url) if url else 10_000
    return [name for name, _ in sorted(order.items(), key=lambda item: (item[1], item[0]))]


def _type_matchups(type_payloads: list[dict[str, Any]] | None) -> list[TypeMatchup]:
    if not type_payloads:
        return []
    relations = [payload.get("damage_relations") or {} for payload in type_payloads]
    return defensive_matchups(relations)
