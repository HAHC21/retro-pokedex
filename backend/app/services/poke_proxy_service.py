import asyncio
import re
from typing import Any

from app.integrations.pokeapi.client import PokeApiClient
from app.repositories.move_repository import MoveRepository
from app.repositories.pokedex_entry_repository import PokedexEntryRepository
from app.repositories.pokemon_overview_repository import PokemonOverviewRepository
from app.services.learnset_service import build_learnset

NOT_WILD = re.compile(r"gift|only-one|trade|starter|squirt-bottle|wailmer-pail")
POKECENTER = re.compile(r"pokecenter|poke-center")


def _title(value: str) -> str:
    if not value:
        return ""
    return "-".join(part[:1].upper() + part[1:] for part in value.split("-") if part)


def _pretty(value: str) -> str:
    if not value:
        return ""
    return " ".join(part[:1].upper() + part[1:] for part in value.split("-") if part)


def _id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1] or "0")


def _cond_text(detail: dict[str, Any] | None) -> str:
    if not detail:
        return "—"
    parts: list[str] = []
    if detail.get("min_level"):
        parts.append(f"Level {detail['min_level']}")
    item = detail.get("item")
    if item:
        parts.append(_pretty(item.get("name", "")))
    held = detail.get("held_item")
    if held:
        parts.append(f"Holding {_pretty(held.get('name', ''))}")
    if detail.get("min_happiness"):
        parts.append(f"Friendship {detail['min_happiness']}")
    time_of_day = detail.get("time_of_day")
    if time_of_day:
        parts.append("Daytime" if time_of_day == "day" else "Night")
    location = detail.get("location")
    if location:
        parts.append(_title(location.get("name", "")))
    known_move = detail.get("known_move")
    if known_move:
        parts.append(f"Knows {_title(known_move.get('name', ''))}")
    trigger = detail.get("trigger") or {}
    if trigger.get("name") == "trade":
        parts.append("Trade")
    if not parts and trigger.get("name"):
        parts.append(_title(trigger["name"]))
    return " · ".join(parts) if parts else "—"


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


def _evolve_label(parent: str, detail: dict[str, Any] | None) -> str:
    if not detail:
        return f"Evolve {parent}"
    trigger = (detail.get("trigger") or {}).get("name") or ""
    item = (detail.get("item") or {}).get("name")
    held = (detail.get("held_item") or {}).get("name")
    if trigger == "trade":
        if held:
            return f"Trade {parent} while holding {_pretty(held)}"
        return f"Trade {parent}"
    if trigger == "use-item" and item:
        return f"Evolve {parent} using {_pretty(item)}"
    if detail.get("min_level"):
        return f"Evolve {parent} at Level {detail['min_level']}"
    cond = _cond_text(detail)
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
                details = nxt.get("evolution_details") or []
                return details[0] if details else None
            found = walk(nxt)
            if found is not None:
                return found
        return None

    return walk(chain.get("chain") or {})


class PokeProxyService:
    """Compose SPA-facing PokéAPI payloads; all upstream reads go through the cached client."""

    def __init__(
        self,
        client: PokeApiClient,
        pokedex_entries: PokedexEntryRepository | None = None,
        moves: MoveRepository | None = None,
        overviews: PokemonOverviewRepository | None = None,
    ) -> None:
        self._client = client
        self._pokedex_entries = pokedex_entries or PokedexEntryRepository()
        self._moves = moves or MoveRepository()
        self._overviews = overviews or PokemonOverviewRepository()
        self._area_region: dict[str, str | None] = {}
        self._loc_region: dict[str, str | None] = {}
        self._area_loc: dict[str, str] = {}
        self._obtain_index: dict[str, Any] | None = None

    async def name_index(self, limit: int = 1025) -> dict[str, str]:
        # Species list keeps base names (Giratina, Pumpkaboo) without form suffixes.
        payload = await self._client.list_species(limit=limit, offset=0)
        names: dict[str, str] = {}
        for index, entry in enumerate(payload.get("results") or []):
            names[str(index + 1)] = _title(entry.get("name") or "")
        return names

    async def type_ids(self, type_name: str) -> list[int]:
        payload = await self._client.get_type(type_name)
        if not payload:
            return []
        ids: list[int] = []
        for entry in payload.get("pokemon") or []:
            pokemon_id = _id_from_url((entry.get("pokemon") or {}).get("url") or "")
            if 1 <= pokemon_id <= 1025:
                ids.append(pokemon_id)
        return ids

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
        raw = await self._client.get_encounters(pokemon_id)
        species = await self._client.get_species(pokemon_id)
        parent = None
        if species and species.get("evolves_from_species"):
            parent = _id_from_url(species["evolves_from_species"].get("url") or "")
        return {
            "versions": obtain_versions_from_raw(raw),
            "evolves_from": parent,
        }

    async def obtain_index(self, *, limit: int = 1025) -> dict[str, Any]:
        """National Dex obtain versions + evolves_from from Mongo cache (one bulk read)."""
        if self._obtain_index is not None and int(self._obtain_index.get("count") or 0) >= limit:
            return self._obtain_index

        encounter_paths = [f"pokemon/{pokemon_id}/encounters" for pokemon_id in range(1, limit + 1)]
        species_paths = [f"pokemon-species/{pokemon_id}" for pokemon_id in range(1, limit + 1)]
        cached = await self._client.get_cached_many(encounter_paths + species_paths)

        versions: dict[str, list[str]] = {}
        evolves_from: dict[str, int | None] = {}
        for pokemon_id in range(1, limit + 1):
            key = str(pokemon_id)
            raw = cached.get(f"pokemon/{pokemon_id}/encounters")
            if not isinstance(raw, list):
                raw = []
            versions[key] = obtain_versions_from_raw(raw)
            species = cached.get(f"pokemon-species/{pokemon_id}")
            parent = None
            if isinstance(species, dict) and species.get("evolves_from_species"):
                parent = _id_from_url(species["evolves_from_species"].get("url") or "") or None
            evolves_from[key] = parent

        payload = {
            "count": limit,
            "versions": versions,
            "evolves_from": evolves_from,
        }
        self._obtain_index = payload
        return payload

    async def acquisition(self, pokemon_id: int, game_key: str) -> dict[str, Any]:
        if game_key == "home":
            return {"text": "Pokémon HOME", "methods": ["home"]}
        raw, species = await asyncio.gather(
            self._client.get_encounters(pokemon_id),
            self._client.get_species(pokemon_id),
        )
        labels = self._labels_from_encounters(raw or [], game_key)
        evo_label = await self._evolution_label(species or {}, pokemon_id)
        if evo_label:
            labels.append(evo_label)
        return {"text": " / ".join(labels), "methods": labels}

    def _labels_from_encounters(self, raw: list[dict[str, Any]], game_key: str) -> list[str]:
        allowed = GAME_VERSIONS.get(game_key, [])
        allowed_set = None if allowed is None else set(allowed)
        best: dict[str, tuple[int, str]] = {}
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
                    kind = _encounter_kind((item.get("method") or {}).get("name") or "")
                    chance = int(item.get("chance") or 0)
                    prev = best.get(kind)
                    if not prev or chance > prev[0]:
                        best[kind] = (chance, _kind_label(kind, place))
        order = ("wild", "starter", "gift", "static", "trade")
        return [best[kind][1] for kind in order if kind in best]

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

    async def pokemon_detail(self, pokemon_id: int) -> dict[str, Any] | None:
        data, raw = await asyncio.gather(
            self._client.get_pokemon(pokemon_id),
            self._client.get_encounters(pokemon_id),
        )
        if data is None:
            return None
        species_url = (data.get("species") or {}).get("url") or ""
        species_id = _id_from_url(species_url) or pokemon_id
        species = await self._client.get_species(species_id) or {}
        evo = await self._evolution_steps(species)
        parent = None
        if species.get("evolves_from_species"):
            parent = _id_from_url(species["evolves_from_species"].get("url") or "")
        overview_doc = await asyncio.to_thread(self._overviews.get, species_id)
        abilities = await self._abilities_with_descriptions(data.get("abilities") or [])
        return {
            "data": {**data, "abilities": abilities},
            "species": species,
            "evo": evo,
            "obtain_versions": obtain_versions_from_raw(raw),
            "evolves_from": parent,
            "overview": overview_doc.overview if overview_doc else None,
        }

    async def pokemon_spawns(self, pokemon_id: int) -> dict[str, Any]:
        raw = await self._client.get_encounters(pokemon_id)
        wild = filter_wild_encounters(raw)
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
                details = nxt.get("evolution_details") or []
                walk(nxt, _cond_text(details[0] if details else None))

        walk(chain.get("chain") or {}, "Base")
        return steps

    async def _abilities_with_descriptions(self, abilities: list[dict[str, Any]]) -> list[dict[str, Any]]:
        names: list[str] = []
        for entry in abilities:
            name = (entry.get("ability") or {}).get("name") or ""
            if name and name not in names:
                names.append(name)
        payloads = await asyncio.gather(*(self._client.get_ability(name) for name in names))
        effects = {name: _english_ability_effect(payload) for name, payload in zip(names, payloads)}
        return [{**entry, "description": effects.get((entry.get("ability") or {}).get("name") or "")} for entry in abilities]

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
