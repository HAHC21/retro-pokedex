import asyncio
import re
from typing import Any

from app.catalog.game_availability import (
    GMAX_VERSIONS,
    MEGA_DEX_VERSIONS,
    POKEDEX_VERSIONS,
    availability_rows,
    event_versions_for_species,
    is_mechanic_form,
    is_mechanic_variety,
    mechanic_versions_from_moves,
    versions_in_pokedexes,
    ways_by_version,
)
from app.catalog.pokemon_form import form_key
from app.catalog.type_matchups import ATTACKING_TYPES
from app.integrations.pokeapi.client import PokeApiClient
from app.repositories.ability_effect_repository import AbilityEffectRepository
from app.repositories.location_meta_repository import LocationMetaRepository
from app.repositories.move_repository import MoveRepository
from app.repositories.obtain_index_repository import ObtainIndexRepository
from app.repositories.pokedex_entry_repository import PokedexEntryRepository
from app.repositories.pokemon_acquisition_repository import PokemonAcquisitionRepository
from app.repositories.pokemon_detail_view_repository import PokemonDetailViewRepository
from app.repositories.pokemon_evolution_repository import PokemonEvolutionRepository
from app.repositories.pokemon_names_repository import PokemonNamesRepository
from app.db.documents import PokemonDocument
from app.repositories.pokemon_form_repository import PokemonRepository
from app.repositories.pokemon_overview_repository import PokemonOverviewRepository, overview_texts
from app.repositories.pokemon_spawns_repository import PokemonSpawnsRepository
from app.repositories.type_membership_repository import TypeMembershipRepository
from app.services.learnset_service import build_learnset

NOT_WILD = re.compile(r"gift|only-one|trade|starter|squirt-bottle|wailmer-pail")
POKECENTER = re.compile(r"pokecenter|poke-center")


def _title(value: str) -> str:
    if not value:
        return ""
    return "-".join(part[:1].upper() + part[1:] for part in value.split("-") if part)


def _apply_stored_stats(payload: dict[str, Any], record: PokemonDocument) -> dict[str, Any]:
    stats = record.stats
    if stats is None:
        return payload
    stored = {
        "hp": stats.hp,
        "attack": stats.attack,
        "defense": stats.defense,
        "special-attack": stats.special_attack,
        "special-defense": stats.special_defense,
        "speed": stats.speed,
    }
    data = dict(payload.get("data") or {})
    updated = []
    for entry in data.get("stats") or []:
        name = ((entry.get("stat") or {}).get("name") or "") if isinstance(entry, dict) else ""
        if name in stored:
            updated.append({**entry, "base_stat": stored[name]})
        else:
            updated.append(entry)
    if not updated:
        return payload
    data["stats"] = updated
    return {**payload, "data": data}


def _pretty(value: str) -> str:
    if not value:
        return ""
    return " ".join(part[:1].upper() + part[1:] for part in value.split("-") if part)


def _id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1] or "0")


def _form_and_species(
    record: PokemonDocument | None,
    resource_id: int,
    payload: dict[str, Any],
) -> tuple[str, int]:
    data = payload.get("data") or {}
    species = payload.get("species") or {}
    species_url = (data.get("species") or {}).get("url") or ""
    species_id = _id_from_url(species_url) or resource_id
    if record is not None:
        return record.form, int(record.pokedex_id)
    if resource_id == species_id:
        return "base", species_id
    key = form_key(str(data.get("name") or ""), str(species.get("name") or ""))
    return key or "base", species_id


def _named(value: Any) -> str:
    if not isinstance(value, dict):
        return ""
    return str(value.get("name") or "")


_NAMED_REQUIREMENT_KEYS = (
    "item",
    "held_item",
    "known_move",
    "known_move_type",
    "location",
    "party_species",
    "party_type",
    "trade_species",
)


def _detail_requirement_count(detail: dict[str, Any]) -> int:
    count = sum(1 for key in _NAMED_REQUIREMENT_KEYS if _named(detail.get(key)))
    for key in ("min_level", "min_happiness", "min_beauty", "min_affection", "needs_overworld_rain", "turn_upside_down"):
        if detail.get(key):
            count += 1
    if detail.get("gender"):
        count += 1
    if detail.get("relative_physical_stats") is not None:
        count += 1
    if detail.get("time_of_day"):
        count += 1
    return count


def _pick_evolution_detail(details: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Prefer the method that states every requirement, such as friendship plus a move type."""
    if not details:
        return None
    return max(details, key=_detail_requirement_count)


def _join_level_phrase(lead: str, qualifiers: list[str]) -> str:
    if not qualifiers:
        return lead
    if len(qualifiers) == 1:
        return f"{lead} {qualifiers[0]}"
    return f"{lead} {', '.join(qualifiers[:-1])} and {qualifiers[-1]}"


def _evolution_qualifiers(detail: dict[str, Any]) -> list[str]:
    qualifiers: list[str] = []
    gender = detail.get("gender")
    if gender == 1:
        qualifiers.append("if female")
    elif gender == 2:
        qualifiers.append("if male")
    if detail.get("min_happiness"):
        qualifiers.append("with high friendship")
    if detail.get("min_affection"):
        qualifiers.append("with high affection")
    if detail.get("min_beauty"):
        qualifiers.append("with high beauty")
    time_of_day = detail.get("time_of_day")
    if time_of_day == "day":
        qualifiers.append("during the day")
    elif time_of_day:
        qualifiers.append("at night")
    if detail.get("needs_overworld_rain"):
        qualifiers.append("in the rain")
    if detail.get("turn_upside_down"):
        qualifiers.append("while the console is upside down")
    location = _named(detail.get("location"))
    if location:
        qualifiers.append(f"at {_pretty(location)}")
    held = _named(detail.get("held_item"))
    if held:
        qualifiers.append(f"while holding {_pretty(held)}")
    known_move = _named(detail.get("known_move"))
    if known_move:
        qualifiers.append(f"while knowing {_title(known_move)}")
    known_move_type = _named(detail.get("known_move_type"))
    if known_move_type:
        qualifiers.append(f"while knowing a {_pretty(known_move_type)}-type move")
    party_species = _named(detail.get("party_species"))
    if party_species:
        qualifiers.append(f"with {_pretty(party_species)} in the party")
    party_type = _named(detail.get("party_type"))
    if party_type:
        qualifiers.append(f"with a {_pretty(party_type)}-type Pokémon in the party")
    stats = detail.get("relative_physical_stats")
    if stats is not None:
        if stats > 0:
            qualifiers.append("when Attack is higher than Defense")
        elif stats < 0:
            qualifiers.append("when Defense is higher than Attack")
        else:
            qualifiers.append("when Attack equals Defense")
    return qualifiers


def _cond_text(detail: dict[str, Any] | None) -> str:
    if not detail:
        return "—"
    trigger_name = _named(detail.get("trigger"))
    item_name = _named(detail.get("item"))
    held_name = _named(detail.get("held_item"))
    if item_name and trigger_name == "use-item":
        return _join_level_phrase(_pretty(item_name), _evolution_qualifiers(detail))
    if trigger_name == "trade":
        if held_name:
            return f"Trade while holding {_pretty(held_name)}"
        partner = _named(detail.get("trade_species"))
        if partner:
            return f"Trade for {_pretty(partner)}"
        return "Trade"

    qualifiers = _evolution_qualifiers(detail)
    if detail.get("min_level"):
        return _join_level_phrase(f"Level {detail['min_level']}", qualifiers)
    if trigger_name == "level-up":
        return _join_level_phrase("Level up", qualifiers)
    if item_name:
        return _join_level_phrase(_pretty(item_name), qualifiers)
    if qualifiers:
        return _join_level_phrase("Level up", qualifiers)
    if trigger_name:
        return _title(trigger_name)
    return "—"


def _place_label(area_name: str) -> str:
    name = re.sub(r"-area$", "", area_name or "", flags=re.I)
    name = REGION_PREFIX.sub("", name)
    safari = re.match(r"^friend-safari(?:-(.+))?$", name, re.I)
    if safari:
        kind = safari.group(1)
        return f"Friend Safari ({_pretty(kind)})" if kind else "Friend Safari"
    route = re.match(r"^route-(\d+[a-z]?)$", name, re.I)
    if route:
        return f"Route {route.group(1)}"
    return _pretty(name) or "Unknown"


def _encounter_kind(method_name: str) -> str:
    name = method_name or ""
    if re.search(r"trade", name):
        return "trade"
    if re.search(r"starter", name):
        return "starter"
    if re.search(r"gift", name):
        return "gift"
    if re.search(r"only-one", name):
        return "static"
    return "wild"


def _kind_label(kind: str, place: str) -> str:
    if kind == "wild":
        return f"Wild Encounter at {place}"
    if kind == "starter":
        return f"Starter at {place}"
    if kind == "gift":
        return f"Gift at {place}"
    if kind == "static":
        return f"Static Encounter at {place}"
    if kind == "trade":
        return "In-game trade"
    return place


# Walking, rustling grass, and flower spots stay "Wild Encounter".
# Anything else in the wild bucket is a tool or rod the player has to use.
ORDINARY_WILD = {
    "walk",
    "dark-grass",
    "grass-spots",
    "yellow-flowers",
    "purple-flowers",
    "red-flowers",
    "rough-terrain",
}

ROD_LABELS = {
    "old-rod": "Old Rod",
    "good-rod": "Good Rod",
    "super-rod": "Super Rod",
}

FIELD_LABELS = {
    "rock-smash": "Rock Smash",
    "headbutt": "Headbutt",
    "waterfall": "Waterfall",
    "whirlpool": "Whirlpool",
    "honey": "Honey",
    "seaweed": "Seaweed",
    "squirt-bottle": "Squirt Bottle",
    "wailmer-pail": "Wailmer Pail",
    "pokeflute": "Poké Flute",
}

SPECIAL_ORDER = (
    "old-rod",
    "good-rod",
    "super-rod",
    "rock-smash",
    "headbutt",
    "surf",
    "dive",
    "waterfall",
    "whirlpool",
    "honey",
    "seaweed",
    "squirt-bottle",
    "wailmer-pail",
    "pokeflute",
)


def _special_phrase(method: str) -> str:
    if method in ROD_LABELS:
        return f"Fishing with {ROD_LABELS[method]}"
    if method == "surf":
        return "Surfing"
    if method == "dive":
        return "Diving"
    if method in FIELD_LABELS:
        return f"Using {FIELD_LABELS[method]}"
    return f"Using {_pretty(method)}"


def _wild_label(samples: list[tuple[str, int, str]]) -> str:
    """Name the tool only when every encounter in this game needs one."""
    ordinary = [item for item in samples if not item[0] or item[0] in ORDINARY_WILD]
    if ordinary:
        place = max(ordinary, key=lambda item: item[1])[2]
        return _kind_label("wild", place)
    best_by_method: dict[str, tuple[int, str]] = {}
    for method, chance, place in samples:
        previous = best_by_method.get(method)
        if not previous or chance > previous[0]:
            best_by_method[method] = (chance, place)
    ordered = sorted(
        best_by_method,
        key=lambda method: (
            SPECIAL_ORDER.index(method) if method in SPECIAL_ORDER else len(SPECIAL_ORDER),
            method,
        ),
    )
    parts: list[str] = []
    for method in ordered:
        _, place = best_by_method[method]
        where = "" if not place or place == "Unknown" else f" at {place}"
        parts.append(f"{_special_phrase(method)}{where}")
    return " / ".join(parts)


def _evolve_label(parent: str, detail: dict[str, Any] | None) -> str:
    if not detail:
        return f"Evolve {parent}"
    trigger = _named(detail.get("trigger"))
    item = _named(detail.get("item"))
    if trigger == "trade":
        cond = _cond_text(detail)
        rest = cond.removeprefix("Trade").strip()
        return f"Trade {parent} {rest}".strip() if rest else f"Trade {parent}"
    if trigger == "use-item" and item:
        return f"Evolve {parent} using {_cond_text(detail)}"
    cond = _cond_text(detail)
    if cond.startswith("Level up"):
        rest = cond.removeprefix("Level up").strip()
        return f"Level up {parent} {rest}".strip() if rest else f"Level up {parent}"
    if cond.startswith("Level "):
        return f"Evolve {parent} at {cond}"
    if cond and cond != "—":
        return f"Evolve {parent} ({cond})"
    return f"Evolve {parent}"


def obtain_versions_from_raw(raw: list[dict[str, Any]]) -> list[str]:
    versions: set[str] = set()
    for entry in raw:
        area = (entry.get("location_area") or {}).get("name") or ""
        if POKECENTER.search(area):
            continue
        for detail in entry.get("version_details") or []:
            if detail.get("encounter_details"):
                name = (detail.get("version") or {}).get("name")
                if name:
                    versions.add(name)
    return sorted(versions)


def filter_wild_encounters(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    for entry in raw:
        area_name = (entry.get("location_area") or {}).get("name") or ""
        if POKECENTER.search(area_name):
            continue
        versions: list[dict[str, Any]] = []
        for detail in entry.get("version_details") or []:
            details = [
                item
                for item in (detail.get("encounter_details") or [])
                if not NOT_WILD.search((item.get("method") or {}).get("name") or "")
            ]
            if details:
                versions.append({**detail, "encounter_details": details})
        if versions:
            filtered.append({**entry, "version_details": versions})
    return filtered


# PokéAPI version names that belong to each save slot. HOME → all versions.
GAME_VERSIONS: dict[str, list[str] | None] = {
    "rb": ["red", "blue"],
    "y": ["yellow"],
    "gs": ["gold", "silver"],
    "c": ["crystal"],
    "rs": ["ruby", "sapphire"],
    "e": ["emerald"],
    "frlg": ["firered", "leafgreen"],
    "dp": ["diamond", "pearl"],
    "pt": ["platinum"],
    "hgss": ["heartgold", "soulsilver"],
    "bw": ["black", "white"],
    "b2w2": ["black-2", "white-2"],
    "xy": ["x", "y"],
    "oras": ["omega-ruby", "alpha-sapphire"],
    "sm": ["sun", "moon"],
    "usum": ["ultra-sun", "ultra-moon"],
    "swsh": ["sword", "shield"],
    "bdsp": ["brilliant-diamond", "shining-pearl"],
    "pla": ["legends-arceus"],
    "sv": ["scarlet", "violet"],
    "home": None,
}

REGION_PREFIX = re.compile(
    r"^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea|hisui|kitakami|blueberry)-"
)

# PokéAPI pokedex names that make up each save's regional dex.
GAME_REGIONAL_POKEDEXES: dict[str, list[str]] = {
    "rb": ["kanto"],
    "y": ["kanto"],
    "gs": ["original-johto"],
    "c": ["updated-johto"],
    "rs": ["hoenn"],
    "e": ["hoenn"],
    "frlg": ["kanto"],
    "dp": ["original-sinnoh"],
    "pt": ["extended-sinnoh"],
    "hgss": ["updated-johto"],
    "bw": ["original-unova"],
    "b2w2": ["updated-unova"],
    "xy": ["kalos-central", "kalos-coastal", "kalos-mountain"],
    "oras": ["updated-hoenn"],
    "sm": ["original-alola"],
    "usum": ["updated-alola"],
    "swsh": ["galar", "isle-of-armor", "crown-tundra"],
    "bdsp": ["original-sinnoh"],
    "pla": ["hisui"],
    "sv": ["paldea", "kitakami", "blueberry"],
    "home": ["national"],
}


def unique_regional_pokedex_names() -> list[str]:
    """Deduped PokéAPI pokedex slugs used by GAME_REGIONAL_POKEDEXES (stable order)."""
    names: list[str] = []
    seen: set[str] = set()
    for group in GAME_REGIONAL_POKEDEXES.values():
        for name in group:
            if name in seen:
                continue
            seen.add(name)
            names.append(name)
    return names


def _english_ability_effect(payload: dict[str, Any] | None) -> str | None:
    if not payload:
        return None
    for entry in payload.get("effect_entries") or []:
        if (entry.get("language") or {}).get("name") != "en":
            continue
        text = str(entry.get("short_effect") or entry.get("effect") or "").strip()
        if text:
            return " ".join(text.split())
    flavors = [
        entry
        for entry in payload.get("flavor_text_entries") or []
        if (entry.get("language") or {}).get("name") == "en" and entry.get("flavor_text")
    ]
    if not flavors:
        return None
    return " ".join(str(flavors[-1]["flavor_text"]).split()) or None


def _evolution_detail_for(chain: dict[str, Any], pokemon_id: int) -> dict[str, Any] | None:
    def walk(node: dict[str, Any]) -> dict[str, Any] | None:
        for nxt in node.get("evolves_to") or []:
            species_node = nxt.get("species") or {}
            if _id_from_url(species_node.get("url") or "") == pokemon_id:
                return _pick_evolution_detail(nxt.get("evolution_details") or [])
            found = walk(nxt)
            if found is not None:
                return found
        return None

    return walk(chain.get("chain") or {})


def _evolution_steps_from_chain(chain: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not chain:
        return []
    steps: list[dict[str, Any]] = []

    def walk(node: dict[str, Any], cond: str) -> None:
        species_node = node.get("species") or {}
        steps.append(
            {
                "id": _id_from_url(species_node.get("url") or ""),
                "name": _title(species_node.get("name") or ""),
                "cond": cond,
            }
        )
        for nxt in node.get("evolves_to") or []:
            walk(nxt, _cond_text(_pick_evolution_detail(nxt.get("evolution_details") or [])))

    walk(chain.get("chain") or {}, "Base")
    return steps


def _annotate_encounters(
    encounters: list[dict[str, Any]],
    location_map: dict[str, dict[str, str | None]],
) -> list[dict[str, Any]]:
    annotated: list[dict[str, Any]] = []
    for entry in encounters:
        area_name = (entry.get("location_area") or {}).get("name") or ""
        meta = location_map.get(area_name) or {}
        annotated.append(
            {
                **entry,
                "region": meta.get("region"),
                "loc": meta.get("loc_name"),
            }
        )
    return annotated


def _form_refs(data: dict[str, Any]) -> list[dict[str, str]]:
    refs: list[dict[str, str]] = []
    for entry in data.get("forms") or []:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or "").strip()
        if not name:
            continue
        refs.append({"name": name, "url": str(entry.get("url") or "")})
    return refs


def _project_pokemon_data(data: dict[str, Any], abilities: list[dict[str, Any]]) -> dict[str, Any]:
    """SPA-facing pokemon slice — omit moves and other unused PokéAPI fields."""
    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "height": data.get("height"),
        "weight": data.get("weight"),
        "types": data.get("types") or [],
        "abilities": abilities,
        "stats": data.get("stats") or [],
        "game_indices": data.get("game_indices") or [],
        "species": data.get("species") or {},
        "forms": _form_refs(data),
    }


def _project_species(species: dict[str, Any]) -> dict[str, Any]:
    """Keep fields the detail UI reads; English and Spanish flavor text."""
    flavors = [
        entry
        for entry in (species.get("flavor_text_entries") or [])
        if isinstance(entry, dict) and (entry.get("language") or {}).get("name") in {"en", "es"}
    ]
    return {
        "name": species.get("name"),
        "names": species.get("names") or [],
        "varieties": species.get("varieties") or [],
        "evolution_chain": species.get("evolution_chain"),
        "flavor_text_entries": flavors,
    }


def _abilities_with_effect_map(
    abilities: list[dict[str, Any]],
    effects: dict[str, str | None],
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for entry in abilities:
        name = ((entry.get("ability") or {}).get("name") or "") if isinstance(entry, dict) else ""
        enriched.append({**entry, "description": effects.get(name) if name else None})
    return enriched


class PokeProxyService:
    """Compose SPA-facing PokéAPI payloads; all upstream reads go through the cached client."""

    def __init__(
        self,
        client: PokeApiClient,
        pokedex_entries: PokedexEntryRepository | None = None,
        moves: MoveRepository | None = None,
        overviews: PokemonOverviewRepository | None = None,
        pokemon: PokemonRepository | None = None,
        obtain_index: ObtainIndexRepository | None = None,
        names: PokemonNamesRepository | None = None,
        type_membership: TypeMembershipRepository | None = None,
        location_meta: LocationMetaRepository | None = None,
        spawns: PokemonSpawnsRepository | None = None,
        evolution: PokemonEvolutionRepository | None = None,
        acquisition: PokemonAcquisitionRepository | None = None,
        ability_effects: AbilityEffectRepository | None = None,
        detail_views: PokemonDetailViewRepository | None = None,
    ) -> None:
        self._client = client
        self._pokedex_entries = pokedex_entries or PokedexEntryRepository()
        self._moves = moves or MoveRepository()
        self._overviews = overviews or PokemonOverviewRepository()
        self._pokemon = pokemon or PokemonRepository()
        self._obtain_index_repo = obtain_index or ObtainIndexRepository()
        self._names = names or PokemonNamesRepository()
        self._type_membership = type_membership or TypeMembershipRepository()
        self._location_meta = location_meta or LocationMetaRepository()
        self._spawns = spawns or PokemonSpawnsRepository()
        self._evolution = evolution or PokemonEvolutionRepository()
        self._acquisition = acquisition or PokemonAcquisitionRepository()
        self._ability_effects = ability_effects or AbilityEffectRepository()
        self._detail_views = detail_views or PokemonDetailViewRepository()
        self._area_region: dict[str, str | None] = {}
        self._loc_region: dict[str, str | None] = {}
        self._area_loc: dict[str, str] = {}
        self._obtain_index: dict[str, Any] | None = None
        self._availability_pokedexes_ready = False
        self._location_map: dict[str, dict[str, str | None]] | None = None
        self._ability_effect_map: dict[str, str | None] | None = None

    async def catalog(self, *, limit: int = 1025) -> dict[str, Any]:
        """Single payload: National Dex names + pokemon_id → type names."""
        names = await self.name_index(limit=limit)
        membership = await asyncio.to_thread(self._type_membership.get_all, ATTACKING_TYPES)
        if membership is None:
            membership = await self.rebuild_type_membership()
        types_by_id: dict[str, list[str]] = {}
        for type_name, pokemon_ids in membership.items():
            for pokemon_id in pokemon_ids:
                if 1 <= int(pokemon_id) <= limit:
                    key = str(pokemon_id)
                    types_by_id.setdefault(key, []).append(type_name)
        groups = await asyncio.to_thread(self._pokemon.rarity_groups)
        return {
            "names": names,
            "types": types_by_id,
            "legendaries": groups["legendary"],
            "mythicals": groups["mythical"],
            "pseudos": groups["pseudo"],
            "fossils": groups["fossil"],
            "starters": groups["starter"],
            "count": limit,
        }

    async def alternate_forms(self) -> dict[str, Any]:
        forms = await asyncio.to_thread(self._pokemon.list_alternate_forms)
        return {"forms": forms}

    async def name_index(self, limit: int = 1025) -> dict[str, str]:
        stored = await asyncio.to_thread(self._names.get, min_count=limit)
        if stored is not None:
            return stored
        return await self.rebuild_name_index(limit=limit)

    async def rebuild_name_index(self, *, limit: int = 1025) -> dict[str, str]:
        payload = await self._client.get_cached("pokemon-species", {"limit": limit, "offset": 0})
        if not isinstance(payload, dict):
            payload = await self._client.list_species(limit=limit, offset=0)
        return await asyncio.to_thread(self._names.upsert_from_species_list, payload, limit=limit)

    async def type_ids(self, type_name: str) -> list[int]:
        stored = await asyncio.to_thread(self._type_membership.get_ids, type_name)
        if stored is not None:
            return stored
        rebuilt = await self.rebuild_type_membership(type_names=(type_name,))
        return rebuilt.get(type_name, [])

    async def rebuild_type_membership(
        self,
        *,
        type_names: tuple[str, ...] | None = None,
    ) -> dict[str, list[int]]:
        names = type_names or ATTACKING_TYPES
        result: dict[str, list[int]] = {}
        for name in names:
            payload = await self._client.get_cached(f"type/{name}")
            if not isinstance(payload, dict):
                payload = await self._client.get_type(name)
            ids = await asyncio.to_thread(self._type_membership.upsert_from_type_payload, name, payload)
            result[name] = ids
        return result

    async def regional_dex(self, game_key: str) -> dict[str, Any]:
        names = GAME_REGIONAL_POKEDEXES.get(game_key)
        if not names:
            raise KeyError(game_key)

        for dex_name in names:
            needs_sync = await asyncio.to_thread(self._pokedex_entries.needs_sync, dex_name)
            if needs_sync:
                payload = await self._client.get_pokedex(dex_name)
                await asyncio.to_thread(self._pokedex_entries.sync_from_payload, dex_name, payload)

        entries = await asyncio.to_thread(self._pokedex_entries.aggregate_regional, names)
        return {
            "game": game_key,
            "entries": entries,
            "ids": [int(item["id"]) for item in entries],
        }

    async def obtain_meta(self, pokemon_id: int) -> dict[str, Any]:
        index = await self.obtain_index(limit=max(pokemon_id, 1025))
        key = str(pokemon_id)
        parent = index["evolves_from"].get(key)
        return {
            "versions": list(index["versions"].get(key) or []),
            "evolves_from": int(parent) if parent is not None else None,
        }

    async def obtain_index(self, *, limit: int = 1025) -> dict[str, Any]:
        """Serve the slim National Dex obtain index (persisted singleton; rebuild on miss)."""
        if self._obtain_index is not None and int(self._obtain_index.get("count") or 0) >= limit:
            return self._obtain_index

        stored = await asyncio.to_thread(self._obtain_index_repo.get, min_count=limit)
        if stored is not None:
            self._obtain_index = stored
            return stored

        payload = await self.rebuild_obtain_index(limit=limit)
        return payload

    async def rebuild_obtain_index(self, *, limit: int = 1025) -> dict[str, Any]:
        """Scan pokeapi_cache once, persist a slim index, and keep it in process memory."""
        encounters, parent_refs = await self._client.scan_obtain_sources(limit)

        versions: dict[str, list[str]] = {}
        evolves_from: dict[str, int] = {}
        for pokemon_id in range(1, limit + 1):
            key = str(pokemon_id)
            raw = encounters.get(pokemon_id)
            if not isinstance(raw, list):
                raw = []
            version_list = obtain_versions_from_raw(raw)
            # Omit empty lists — clients fill defaults for 1..count.
            if version_list:
                versions[key] = version_list
            parent_ref = parent_refs.get(pokemon_id)
            parent = None
            if isinstance(parent_ref, dict):
                parent = _id_from_url(parent_ref.get("url") or "") or None
            # Omit base forms (null) — clients fill defaults for 1..count.
            if parent:
                evolves_from[key] = parent

        payload = await asyncio.to_thread(
            self._obtain_index_repo.upsert,
            count=limit,
            versions=versions,
            evolves_from=evolves_from,
        )
        self._obtain_index = payload
        return payload

    async def rebuild_location_meta(self, *, limit: int = 1025) -> int:
        """Build area → loc/region from encounter refs + cached location-area/location rows."""
        encounters, _ = await self._client.scan_obtain_sources(limit)
        areas: dict[str, int] = {}
        for raw in encounters.values():
            if not isinstance(raw, list):
                continue
            for entry in raw:
                area = entry.get("location_area") or {}
                area_name = area.get("name") or ""
                if not area_name:
                    continue
                area_id = _id_from_url(area.get("url") or "")
                if area_id:
                    areas[area_name] = area_id

        area_payloads = await self._client.get_cached_many(
            [f"location-area/{area_id}" for area_id in sorted(set(areas.values()))]
        )
        loc_ids: dict[str, int] = {}
        area_to_loc: dict[str, str] = {}
        for area_name, area_id in areas.items():
            payload = area_payloads.get(f"location-area/{area_id}")
            if not isinstance(payload, dict):
                continue
            loc = payload.get("location") or {}
            loc_name = loc.get("name") or ""
            if not loc_name:
                continue
            area_to_loc[area_name] = loc_name
            loc_id = _id_from_url(loc.get("url") or "")
            if loc_id:
                loc_ids[loc_name] = loc_id

        loc_payloads = await self._client.get_cached_many(
            [f"location/{loc_id}" for loc_id in sorted(set(loc_ids.values()))]
        )
        loc_region: dict[str, str | None] = {}
        for loc_name, loc_id in loc_ids.items():
            payload = loc_payloads.get(f"location/{loc_id}")
            region = None
            if isinstance(payload, dict) and payload.get("region"):
                region = _title((payload.get("region") or {}).get("name") or "") or None
            loc_region[loc_name] = region

        rows: list[dict[str, Any]] = []
        for area_name, area_id in areas.items():
            loc_name = area_to_loc.get(area_name)
            rows.append(
                {
                    "area_name": area_name,
                    "area_id": area_id,
                    "loc_name": loc_name,
                    "region": loc_region.get(loc_name) if loc_name else None,
                }
            )
        count = await asyncio.to_thread(self._location_meta.replace_all, rows)
        self._location_map = None
        return count

    async def rebuild_pokemon_evolution(self, *, limit: int = 1025) -> int:
        refs = await self._client.scan_species_evolution_refs(limit)
        chain_ids: set[int] = set()
        for payload in refs.values():
            chain_url = ((payload.get("evolution_chain") or {}).get("url") or "") if payload else ""
            chain_id = _id_from_url(chain_url) if chain_url else 0
            if chain_id:
                chain_ids.add(chain_id)
        chain_payloads = await self._client.get_cached_many(
            [f"evolution-chain/{chain_id}" for chain_id in sorted(chain_ids)]
        )
        steps_by_chain = {
            chain_id: _evolution_steps_from_chain(chain_payloads.get(f"evolution-chain/{chain_id}"))
            for chain_id in chain_ids
        }

        rows: list[dict[str, Any]] = []
        for pokemon_id in range(1, limit + 1):
            payload = refs.get(pokemon_id) or {}
            parent_ref = payload.get("evolves_from_species") if isinstance(payload.get("evolves_from_species"), dict) else {}
            parent_name = _title((parent_ref or {}).get("name") or "") or None
            parent_id = _id_from_url((parent_ref or {}).get("url") or "") or None
            if not parent_name:
                parent_id = None
            chain_url = ((payload.get("evolution_chain") or {}).get("url") or "") if payload else ""
            chain_id = _id_from_url(chain_url) if chain_url else 0
            steps = steps_by_chain.get(chain_id, [])
            evolve_label = None
            if parent_name:
                chain = chain_payloads.get(f"evolution-chain/{chain_id}") if chain_id else None
                detail = _evolution_detail_for(chain or {}, pokemon_id) if isinstance(chain, dict) else None
                evolve_label = _evolve_label(parent_name, detail)
            rows.append(
                {
                    "pokemon_id": pokemon_id,
                    "steps": steps,
                    "parent_id": parent_id,
                    "parent_name": parent_name,
                    "evolve_label": evolve_label,
                }
            )
        return await asyncio.to_thread(self._evolution.replace_all, rows)

    async def rebuild_pokemon_spawns(self, *, limit: int = 1025) -> int:
        location_map = await asyncio.to_thread(self._location_meta.get_map)
        self._location_map = location_map
        encounters, _ = await self._client.scan_obtain_sources(limit)
        rows: list[tuple[int, list[dict[str, Any]]]] = []
        for pokemon_id in range(1, limit + 1):
            raw = encounters.get(pokemon_id)
            if not isinstance(raw, list):
                raw = []
            wild = filter_wild_encounters(raw)
            enc = _annotate_encounters(wild, location_map)
            rows.append((pokemon_id, enc))
        return await asyncio.to_thread(self._spawns.replace_all, rows)

    async def rebuild_pokemon_acquisition(self, *, limit: int = 1025) -> int:
        encounters, _ = await self._client.scan_obtain_sources(limit)
        evolve_labels = await asyncio.to_thread(self._evolution.evolve_labels_map)
        game_keys = [key for key in GAME_VERSIONS if key != "home"]
        rows: list[tuple[int, dict[str, dict[str, Any]]]] = []
        for pokemon_id in range(1, limit + 1):
            raw = encounters.get(pokemon_id)
            if not isinstance(raw, list):
                raw = []
            evolve_label = evolve_labels.get(pokemon_id)
            by_game: dict[str, dict[str, Any]] = {
                "home": {"text": "Pokémon HOME", "methods": ["home"]},
            }
            for game_key in game_keys:
                labels = self._labels_from_encounters(raw, game_key)
                if evolve_label:
                    labels = [*labels, evolve_label]
                by_game[game_key] = {"text": " / ".join(labels), "methods": labels}
            rows.append((pokemon_id, by_game))
        return await asyncio.to_thread(self._acquisition.replace_all, rows)

    async def rebuild_ability_effects(self, *, limit: int = 1025) -> int:
        """Collect ability names from pokemon payloads; store English effects from ability cache."""
        ability_names: set[str] = set()
        chunk = 200
        for start in range(1, limit + 1, chunk):
            end = min(limit, start + chunk - 1)
            paths = [f"pokemon/{pokemon_id}" for pokemon_id in range(start, end + 1)]
            payloads = await self._client.get_cached_many(paths)
            for data in payloads.values():
                if not isinstance(data, dict):
                    continue
                for entry in data.get("abilities") or []:
                    if not isinstance(entry, dict):
                        continue
                    name = ((entry.get("ability") or {}).get("name") or "") if isinstance(entry.get("ability"), dict) else ""
                    if name:
                        ability_names.add(name)

        ability_payloads = await self._client.get_cached_many(
            [f"ability/{name}" for name in sorted(ability_names)]
        )
        rows: list[dict[str, Any]] = []
        for name in sorted(ability_names):
            payload = ability_payloads.get(f"ability/{name}")
            rows.append(
                {
                    "ability_name": name,
                    "description": _english_ability_effect(payload if isinstance(payload, dict) else None),
                }
            )
        count = await asyncio.to_thread(self._ability_effects.replace_all, rows)
        self._ability_effect_map = None
        return count

    async def rebuild_pokemon_detail_views(self, *, limit: int = 1025) -> int:
        """Materialize SPA detail payloads from cache + compiled evolution/obtain/abilities/overviews."""
        effects = await asyncio.to_thread(self._ability_effects.get_map)
        self._ability_effect_map = effects
        evo_steps = await asyncio.to_thread(self._evolution.steps_map)
        overviews = await asyncio.to_thread(self._overviews.overview_map)
        obtain = await self.obtain_index(limit=limit)
        versions = obtain.get("versions") or {}
        evolves_from = obtain.get("evolves_from") or {}

        rows: list[tuple[int, dict[str, Any]]] = []
        chunk = 100
        for start in range(1, limit + 1, chunk):
            end = min(limit, start + chunk - 1)
            ids = list(range(start, end + 1))
            pokemon_paths = [f"pokemon/{pokemon_id}" for pokemon_id in ids]
            species_paths = [f"pokemon-species/{pokemon_id}" for pokemon_id in ids]
            cached = await self._client.get_cached_many(pokemon_paths + species_paths)
            for pokemon_id in ids:
                data = cached.get(f"pokemon/{pokemon_id}")
                if not isinstance(data, dict):
                    continue
                species_url = ((data.get("species") or {}).get("url") or "") if isinstance(data.get("species"), dict) else ""
                species_id = _id_from_url(species_url) or pokemon_id
                species_raw = cached.get(f"pokemon-species/{species_id}")
                if not isinstance(species_raw, dict):
                    species_raw = cached.get(f"pokemon-species/{pokemon_id}") or {}
                if not isinstance(species_raw, dict):
                    species_raw = {}
                abilities = _abilities_with_effect_map(data.get("abilities") or [], effects)
                key = str(species_id)
                parent = evolves_from.get(key)
                payload = {
                    "data": _project_pokemon_data(data, abilities),
                    "species": _project_species(species_raw),
                    "evo": evo_steps.get(species_id, []),
                    "obtain_versions": list(versions.get(key) or []),
                    "evolves_from": int(parent) if parent is not None else None,
                    "overview": overviews.get(species_id),
                }
                rows.append((pokemon_id, payload))
        return await asyncio.to_thread(self._detail_views.replace_all, rows)

    async def acquisition(self, pokemon_id: int, game_key: str) -> dict[str, Any]:
        if game_key == "home":
            return {"text": "Pokémon HOME", "methods": ["home"]}
        cached = await self._client.get_cached(f"pokemon/{pokemon_id}/encounters")
        if isinstance(cached, list):
            labels = self._labels_from_encounters(cached, game_key)
            evo_label = await self._live_evolve_label(pokemon_id)
            if evo_label:
                labels.append(evo_label)
            return {"text": " / ".join(labels), "methods": labels}
        stored = await asyncio.to_thread(self._acquisition.get, pokemon_id, game_key)
        if stored is not None:
            return stored
        raw = await self._client.get_encounters(pokemon_id)
        return await self._acquisition_from_encounters(pokemon_id, game_key, raw or [])

    async def _acquisition_from_encounters(
        self,
        pokemon_id: int,
        game_key: str,
        raw: list[dict[str, Any]],
    ) -> dict[str, Any]:
        labels = self._labels_from_encounters(raw, game_key)
        evo_label = await self._live_evolve_label(pokemon_id)
        if evo_label:
            labels.append(evo_label)
        return {"text": " / ".join(labels), "methods": labels}

    def _labels_from_encounters(self, raw: list[dict[str, Any]], game_key: str) -> list[str]:
        allowed = GAME_VERSIONS.get(game_key, [])
        allowed_set = None if allowed is None else set(allowed)
        best: dict[str, tuple[int, str]] = {}
        wild_samples: list[tuple[str, int, str]] = []
        for entry in raw:
            area = (entry.get("location_area") or {}).get("name") or ""
            if POKECENTER.search(area):
                continue
            place = _place_label(area)
            for detail in entry.get("version_details") or []:
                version = (detail.get("version") or {}).get("name") or ""
                if allowed_set is not None and version not in allowed_set:
                    continue
                for item in detail.get("encounter_details") or []:
                    method = (item.get("method") or {}).get("name") or ""
                    kind = _encounter_kind(method)
                    chance = int(item.get("chance") or 0)
                    if kind == "wild":
                        wild_samples.append((method, chance, place))
                        continue
                    prev = best.get(kind)
                    if not prev or chance > prev[0]:
                        best[kind] = (chance, _kind_label(kind, place))
        labels: list[str] = []
        if wild_samples:
            labels.append(_wild_label(wild_samples))
        for kind in ("starter", "gift", "static", "trade"):
            if kind in best:
                labels.append(best[kind][1])
        return labels

    async def _live_evolve_label(self, pokemon_id: int) -> str | None:
        """Build the evolve sentence from the cached chain so compiled labels cannot go stale."""
        evo = await asyncio.to_thread(self._evolution.get, pokemon_id)
        if evo is not None and not evo.get("parent_name") and not evo.get("evolve_label"):
            return None
        species = await self._client.get_species(pokemon_id)
        if isinstance(species, dict):
            label = await self._evolution_label(species, pokemon_id)
            if label:
                return label
        if evo and evo.get("evolve_label"):
            return str(evo["evolve_label"])
        return None

    async def _evolution_label(self, species: dict[str, Any], pokemon_id: int) -> str | None:
        parent_ref = species.get("evolves_from_species") or {}
        parent_name = _title(parent_ref.get("name") or "")
        if not parent_name:
            return None
        chain_url = (species.get("evolution_chain") or {}).get("url") or ""
        if not chain_url:
            return f"Evolve {parent_name}"
        chain = await self._client.get_evolution_chain(_id_from_url(chain_url))
        detail = _evolution_detail_for(chain or {}, pokemon_id)
        return _evolve_label(parent_name, detail)

    async def pokemon_detail(self, resource_id: int) -> dict[str, Any] | None:
        record = await asyncio.to_thread(self._pokemon.get_by_resource_id, resource_id)
        pokedex_id = int(record.pokedex_id) if record is not None else resource_id
        form = record.form if record is not None else "base"
        stored = await asyncio.to_thread(self._detail_views.get, pokedex_id, form)
        if stored is not None:
            payload = await self._with_form_record(resource_id, stored)
        else:
            live = await self._pokemon_detail_live(resource_id, pokedex_id=pokedex_id, form=form)
            if live is None:
                return None
            payload = await self._with_form_record(resource_id, live)
        payload = await self._ensure_forms(resource_id, payload)
        payload = await self._attach_evolution(pokedex_id, form, payload)
        return await self._attach_games(resource_id, record, payload)

    async def _attach_evolution(self, pokedex_id: int, form: str, payload: dict[str, Any]) -> dict[str, Any]:
        species = payload.get("species") if isinstance(payload.get("species"), dict) else {}
        steps = await self._evolution_steps(species)
        if steps:
            return {**payload, "evo": steps}
        evo_doc = await asyncio.to_thread(self._evolution.get, pokedex_id, form)
        if evo_doc is None and form != "base":
            evo_doc = await asyncio.to_thread(self._evolution.get, pokedex_id, "base")
        if not evo_doc or not evo_doc.get("steps"):
            return payload
        return {**payload, "evo": evo_doc["steps"]}

    async def _ensure_forms(self, resource_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        """Stored detail views predate form refs. Attach them from the cached Pokémon."""
        data = dict(payload.get("data") or {})
        if data.get("forms"):
            return payload
        raw = await self._client.get_pokemon(resource_id)
        if not isinstance(raw, dict):
            return payload
        data["forms"] = _form_refs(raw)
        return {**payload, "data": data}

    async def _attach_games(
        self,
        resource_id: int,
        record: PokemonDocument | None,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        form, species_id = _form_and_species(record, resource_id, payload)
        await self._ensure_availability_pokedexes()
        pokedex_names = await asyncio.to_thread(self._pokedex_entries.pokedexes_for_species, species_id)
        pokedex_versions = versions_in_pokedexes(pokedex_names)
        if is_mechanic_form(form):
            raw = await self._client.get_pokemon(resource_id)
            moves = raw.get("moves") if isinstance(raw, dict) else None
            learned = mechanic_versions_from_moves(moves, kind="mega" if form != "gigantamax" else "gigantamax")
            if form == "gigantamax":
                mechanic = pokedex_versions & GMAX_VERSIONS
            else:
                mechanic = learned | (pokedex_versions & MEGA_DEX_VERSIONS)
            rows = availability_rows(
                form=form,
                encounter_ways={},
                pokedex_versions=set(),
                claimed_versions=set(),
                event_versions=set(),
                mechanic_versions=mechanic,
            )
            return {**payload, "games": rows}

        encounter_ways = ways_by_version(await self._client.get_encounters(resource_id))
        claimed = await self._versions_claimed_by_other_forms(payload, resource_id)
        events = event_versions_for_species(species_id) if form == "base" else set()
        rows = availability_rows(
            form=form,
            encounter_ways=encounter_ways,
            pokedex_versions=pokedex_versions,
            claimed_versions=claimed,
            event_versions=events,
        )
        return {**payload, "games": rows}

    async def _ensure_availability_pokedexes(self) -> None:
        if self._availability_pokedexes_ready:
            return
        for name in POKEDEX_VERSIONS:
            has_rows = await asyncio.to_thread(self._pokedex_entries.has_entries, name)
            if has_rows:
                continue
            pokedex = await self._client.get_pokedex(name)
            if isinstance(pokedex, dict):
                await asyncio.to_thread(self._pokedex_entries.sync_from_payload, name, pokedex)
        self._availability_pokedexes_ready = True

    async def _versions_claimed_by_other_forms(self, payload: dict[str, Any], resource_id: int) -> set[str]:
        claimed: set[str] = set()
        varieties = (payload.get("species") or {}).get("varieties") or []
        for item in varieties:
            pokemon = item.get("pokemon") or {}
            if item.get("is_default"):
                continue
            slug = str(pokemon.get("name") or "")
            if is_mechanic_variety(slug):
                continue
            variety_id = _id_from_url(str(pokemon.get("url") or ""))
            if variety_id <= 0 or variety_id == resource_id:
                continue
            ways = ways_by_version(await self._client.get_encounters(variety_id))
            claimed.update(ways)
        return claimed

    async def _with_form_record(self, resource_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        record = await asyncio.to_thread(self._pokemon.get_by_resource_id, resource_id)
        if record is None:
            return {**payload, "capture": True}
        overview_doc = await asyncio.to_thread(self._overviews.get, record.id)
        payload = {**payload, "overview": overview_texts(overview_doc), "capture": bool(record.capture)}
        if record.types:
            data = dict(payload.get("data") or {})
            data["types"] = [{"type": {"name": name}} for name in record.types]
            payload = {**payload, "data": data}
        elif record is not None:
            names = [
                ((slot.get("type") or {}).get("name") or "")
                for slot in (payload.get("data") or {}).get("types") or []
                if isinstance(slot, dict)
            ]
            names = [name for name in names if name]
            if names:
                record.types = names
                await asyncio.to_thread(record.save)
        return _apply_stored_stats(payload, record)

    async def _pokemon_detail_live(
        self,
        pokemon_id: int,
        *,
        pokedex_id: int | None = None,
        form: str = "base",
    ) -> dict[str, Any] | None:
        data = await self._client.get_pokemon(pokemon_id)
        if data is None:
            return None
        species_url = (data.get("species") or {}).get("url") or ""
        species_id = _id_from_url(species_url) or pokemon_id
        species = await self._client.get_species(species_id) or {}
        evo_doc = await asyncio.to_thread(self._evolution.get, pokedex_id or species_id, form)
        if evo_doc is None and (form.startswith("mega") or form == "gigantamax"):
            evo_doc = await asyncio.to_thread(self._evolution.get, pokedex_id or species_id, "base")
        if evo_doc is not None:
            evo = evo_doc["steps"]
        else:
            evo = await self._evolution_steps(species)
        obtain = await self.obtain_meta(species_id)
        abilities = await self._abilities_with_descriptions(data.get("abilities") or [])
        return {
            "data": _project_pokemon_data(data, abilities),
            "species": _project_species(species),
            "evo": evo,
            "obtain_versions": obtain["versions"],
            "evolves_from": obtain["evolves_from"],
            "overview": None,
        }

    async def pokemon_spawns(self, resource_id: int) -> dict[str, Any]:
        record = await asyncio.to_thread(self._pokemon.get_by_resource_id, resource_id)
        pokedex_id = int(record.pokedex_id) if record is not None else resource_id
        form = record.form if record is not None else "base"
        stored = await asyncio.to_thread(self._spawns.get, pokedex_id, form)
        if stored is None and (form.startswith("mega") or form == "gigantamax"):
            stored = await asyncio.to_thread(self._spawns.get, pokedex_id, "base")
        if stored is not None:
            return {"enc": stored}
        if form.startswith("regional"):
            raw = await self._client.get_encounters(resource_id)
        else:
            raw = await self._client.get_encounters(pokedex_id)
        wild = filter_wild_encounters(raw)
        location_map = self._location_map
        if location_map is None:
            location_map = await asyncio.to_thread(self._location_meta.get_map)
            self._location_map = location_map
        if location_map:
            return {"enc": _annotate_encounters(wild, location_map)}
        enc = await self._resolve_regions(wild)
        return {"enc": enc}

    async def pokemon_learnset(self, pokemon_id: int, game_key: str) -> dict[str, Any]:
        data = await self._client.get_pokemon(pokemon_id)
        if data is None:
            raise KeyError(pokemon_id)
        move_ids: list[int] = []
        for entry in data.get("moves") or []:
            move_ids.append(_id_from_url(((entry.get("move") or {}).get("url") or "")))
        moves_by_id = await asyncio.to_thread(self._moves.get_by_ids, move_ids)
        groups = build_learnset(data, game_key, moves_by_id)
        catalog_count = await asyncio.to_thread(self._moves.count)
        return {"game": game_key, "groups": groups, "catalog_count": catalog_count}

    async def _evolution_steps(self, species: dict[str, Any]) -> list[dict[str, Any]]:
        chain_ref = species.get("evolution_chain") or {}
        chain_url = chain_ref.get("url") or ""
        if not chain_url:
            return []
        chain_id = _id_from_url(chain_url)
        chain = await self._client.get_evolution_chain(chain_id)
        return _evolution_steps_from_chain(chain)

    async def _abilities_with_descriptions(self, abilities: list[dict[str, Any]]) -> list[dict[str, Any]]:
        names: list[str] = []
        for entry in abilities:
            name = (entry.get("ability") or {}).get("name") or ""
            if name and name not in names:
                names.append(name)
        effects = dict(self._ability_effect_map or {})
        if not effects:
            effects = await asyncio.to_thread(self._ability_effects.get_map, names)
        missing = [name for name in names if name not in effects]
        if missing:
            payloads = await asyncio.gather(*(self._client.get_ability(name) for name in missing))
            for name, payload in zip(missing, payloads):
                effects[name] = _english_ability_effect(payload)
        return _abilities_with_effect_map(abilities, effects)

    async def _resolve_regions(self, encounters: list[dict[str, Any]]) -> list[dict[str, Any]]:
        pending_areas: dict[str, int] = {}
        for entry in encounters:
            area = entry.get("location_area") or {}
            area_name = area.get("name") or ""
            if not area_name or area_name in self._area_region or area_name in pending_areas:
                continue
            area_id = _id_from_url(area.get("url") or "")
            if not area_id:
                self._area_region[area_name] = None
                continue
            pending_areas[area_name] = area_id

        if pending_areas:
            area_payloads = await asyncio.gather(
                *[self._client.get_location_area(area_id) for area_id in pending_areas.values()],
                return_exceptions=True,
            )
            pending_locs: dict[str, int] = {}
            area_to_loc: dict[str, str] = {}
            for area_name, area_payload in zip(pending_areas, area_payloads, strict=True):
                if isinstance(area_payload, BaseException) or not area_payload:
                    self._area_region[area_name] = None
                    continue
                loc = area_payload.get("location") or {}
                loc_name = loc.get("name") or ""
                area_to_loc[area_name] = loc_name
                if not loc_name:
                    self._area_region[area_name] = None
                    continue
                if loc_name in self._loc_region:
                    continue
                loc_id = _id_from_url(loc.get("url") or "")
                if loc_id:
                    pending_locs[loc_name] = loc_id
                else:
                    self._loc_region[loc_name] = None

            if pending_locs:
                loc_payloads = await asyncio.gather(
                    *[self._client.get_location(loc_id) for loc_id in pending_locs.values()],
                    return_exceptions=True,
                )
                for loc_name, loc_payload in zip(pending_locs, loc_payloads, strict=True):
                    region = None
                    if not isinstance(loc_payload, BaseException) and loc_payload and loc_payload.get("region"):
                        region = _title(loc_payload["region"].get("name") or "")
                    self._loc_region[loc_name] = region

            for area_name, loc_name in area_to_loc.items():
                self._area_loc[area_name] = loc_name
                self._area_region[area_name] = self._loc_region.get(loc_name)

        return [
            {
                **entry,
                "region": self._area_region.get((entry.get("location_area") or {}).get("name") or ""),
                "loc": self._area_loc.get((entry.get("location_area") or {}).get("name") or ""),
            }
            for entry in encounters
        ]
