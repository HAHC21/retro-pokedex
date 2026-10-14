import asyncio
from typing import Any
from scripts.poke_compile.game_availability import (
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
from app.catalog.type_matchups import ATTACKING_TYPES
from app.integrations.pokeapi.client import PokeApiClient
from app.repositories.ability_effect import AbilityEffectRepository
from app.repositories.game import GameRepository
from app.repositories.generation import GenerationRepository
from app.repositories.pokemon_learnset import PokemonLearnsetRepository
from app.repositories.region import RegionRepository
from app.repositories.location_meta import LocationMetaRepository
from app.repositories.move import MoveRepository
from app.repositories.obtain_index import ObtainIndexRepository
from app.repositories.pokedex_entry import PokedexEntryRepository
from app.repositories.pokemon_acquisition import PokemonAcquisitionRepository
from app.repositories.pokemon_detail_view import PokemonDetailViewRepository
from app.repositories.pokemon_evolution import PokemonEvolutionRepository
from app.repositories.pokemon_names import PokemonNamesRepository
from app.db.app.pokemon_document import PokemonDocument
from app.repositories.pokemon_form import PokemonRepository
from app.repositories.pokemon_overview import PokemonOverviewRepository, overview_texts
from app.repositories.pokemon_spawns import PokemonSpawnsRepository
from app.repositories.type_membership import TypeMembershipRepository

from scripts.poke_compile.const import (
    POKECENTER,
)
from scripts.poke_compile.dex_lists import GAMES, GENERATIONS, REGIONS
from scripts.poke_compile.helpers import (
    _title,
    _id_from_url,
    _form_and_species,
    _place_label,
    _encounter_kind,
    _kind_label,
    _wild_label,
    _evolve_label,
    obtain_versions_from_raw,
    filter_wild_encounters,
    _english_ability_effect,
    _evolution_detail_for,
    _evolution_steps_from_chain,
    _annotate_encounters,
    _form_refs,
    _project_pokemon_data,
    _project_species,
    _abilities_with_effect_map,
)
from app.catalog.pokemon_form import stores_learnset
from app.services.pokemon_detail.helpers import apply_stored_stats
from scripts.learnset.builder import LearnsetBuilder


class PokeCompiler:
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
        self._games = GameRepository()
        self._generations = GenerationRepository()
        self._regions = RegionRepository()
        self._learnsets = PokemonLearnsetRepository()
        self._game_rows: list[dict[str, Any]] | None = None
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
            return {}
        return await asyncio.to_thread(self._names.upsert_from_species_list, payload, limit=limit)

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
                continue
            ids = await asyncio.to_thread(self._type_membership.upsert_from_type_payload, name, payload)
            result[name] = ids
        return result

    async def regional_dex(self, game_key: str) -> dict[str, Any]:
        row = next((item for item in await self._load_games() if item["key"] == game_key), None)
        if row is None:
            raise KeyError(game_key)
        names = list(row["pokedexes"])

        for dex_name in names:
            has_rows = await asyncio.to_thread(self._pokedex_entries.has_entries, dex_name)
            if has_rows:
                continue
            payload = await self._client.get_cached(f"pokedex/{dex_name}")
            if isinstance(payload, dict):
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
        game_keys = [row["key"] for row in await self._load_games() if row["key"] != "home"]
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
        allowed = self._versions_for(game_key)
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
        raw = await self._client.get_cached(f"pokemon/{resource_id}")
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
            raw = await self._client.get_cached(f"pokemon/{resource_id}")
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

        encounter_ways = ways_by_version(await self._cached_encounter_list(resource_id))
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
            pokedex = await self._client.get_cached(f"pokedex/{name}")
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
            ways = ways_by_version(await self._cached_encounter_list(variety_id))
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
        return apply_stored_stats(payload, record)

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
        groups = LearnsetBuilder().build(data, game_key, moves_by_id)
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

    async def _cached_encounter_list(self, resource_id: int) -> list[Any]:
        raw = await self._client.get_cached(f"pokemon/{resource_id}/encounters")
        return raw if isinstance(raw, list) else []

    async def _load_games(self) -> list[dict[str, Any]]:
        if self._game_rows is None:
            self._game_rows = await asyncio.to_thread(self._games.list_all)
        return self._game_rows

    def _versions_for(self, game_key: str) -> list[str] | None:
        rows = self._game_rows if self._game_rows is not None else self._games.list_all()
        self._game_rows = rows
        row = next((item for item in rows if item["key"] == game_key), None)
        if row is None:
            return []
        if row["all_versions"]:
            return None
        return list(row["versions"] or [])

    def seed_static_lists(self) -> dict[str, int]:
        """Write the game, generation, and region seeds. Requests read these collections."""
        self._game_rows = None
        return {
            "games": self._games.replace_all(GAMES),
            "generations": self._generations.replace_all(GENERATIONS),
            "regions": self._regions.replace_all(REGIONS),
        }

    async def compile_learnsets(
        self,
        resource_ids: list[int] | None = None,
        game_key: str | None = None,
    ) -> int:
        records = [
            record
            for record in await asyncio.to_thread(self._pokemon.list_forms, resource_ids)
            if stores_learnset(str(record.form or ""))
        ]
        games = [row for row in await self._load_games() if game_key is None or row["key"] == game_key]
        rows: list[tuple[int, str, str, list[dict[str, Any]]]] = []
        builder = LearnsetBuilder()
        chunk = 40
        for start in range(0, len(records), chunk):
            batch = records[start : start + chunk]
            cached = await self._client.get_cached_many(
                [f"pokemon/{int(record.resource_id)}" for record in batch]
            )
            for record in batch:
                resource_id = int(record.resource_id)
                data = cached.get(f"pokemon/{resource_id}")
                if not isinstance(data, dict):
                    continue
                move_ids = [
                    _id_from_url(((entry.get("move") or {}).get("url") or ""))
                    for entry in data.get("moves") or []
                    if isinstance(entry, dict)
                ]
                moves_by_id = await asyncio.to_thread(self._moves.get_by_ids, move_ids)
                form = str(record.form or "base")
                for game in games:
                    groups = builder.build(
                        data,
                        str(game["key"]),
                        moves_by_id,
                        version_groups=game["version_groups"],
                        all_groups=bool(game["all_version_groups"]),
                    )
                    rows.append((resource_id, str(game["key"]), form, groups))
        if resource_ids is None and game_key is None:
            return await asyncio.to_thread(self._learnsets.replace_all, rows)
        return await asyncio.to_thread(self._learnsets.upsert_many, rows)

    async def compile_detail_views(self, resource_ids: list[int] | None = None) -> int:
        records = await asyncio.to_thread(self._pokemon.list_forms, resource_ids)
        effects = await asyncio.to_thread(self._ability_effects.get_map)
        evo_steps = await asyncio.to_thread(self._evolution.steps_map)
        overviews = await asyncio.to_thread(self._overviews.overview_map)
        obtain = await asyncio.to_thread(self._obtain_index_repo.get, min_count=1) or {}
        versions = obtain.get("versions") or {}
        evolves_from = obtain.get("evolves_from") or {}
        rows: list[tuple[int, str, dict[str, Any]]] = []
        chunk = 40
        for start in range(0, len(records), chunk):
            batch = records[start : start + chunk]
            paths: list[str] = []
            for record in batch:
                resource_id = int(record.resource_id)
                species_id = int(record.pokedex_id)
                paths.extend(
                    [
                        f"pokemon/{resource_id}",
                        f"pokemon-species/{species_id}",
                        f"pokemon/{resource_id}/encounters",
                    ]
                )
            await self._client.get_cached_many(paths)
            for record in batch:
                resource_id = int(record.resource_id)
                species_id = int(record.pokedex_id)
                form = str(record.form or "base")
                data = await self._client.get_cached(f"pokemon/{resource_id}")
                if not isinstance(data, dict):
                    continue
                species_raw = await self._client.get_cached(f"pokemon-species/{species_id}")
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
                data_block = dict(payload["data"])
                data_block["forms"] = _form_refs(data)
                payload["data"] = data_block
                payload = await self._attach_games(resource_id, record, payload)
                rows.append((species_id, form, payload))
        if resource_ids is None:
            return await asyncio.to_thread(self._detail_views.replace_forms, rows)
        return await asyncio.to_thread(self._detail_views.upsert_forms, rows)

    async def compile_spawns_for(self, resource_ids: list[int]) -> int:
        records = await asyncio.to_thread(self._pokemon.list_forms, resource_ids)
        location_map = await asyncio.to_thread(self._location_meta.get_map)
        written = 0
        for record in records:
            resource_id = int(record.resource_id)
            raw = await self._cached_encounter_list(resource_id)
            enc = _annotate_encounters(filter_wild_encounters(raw), location_map)
            await asyncio.to_thread(
                self._spawns.upsert_form,
                int(record.pokedex_id),
                str(record.form or "base"),
                enc,
            )
            written += 1
        return written

    async def compile_acquisition_for(self, pokemon_ids: list[int]) -> int:
        if not pokemon_ids:
            return 0
        games = [row["key"] for row in await self._load_games() if row["key"] != "home"]
        evolve_labels = await asyncio.to_thread(self._evolution.evolve_labels_map)
        written = 0
        for pokemon_id in pokemon_ids:
            raw = await self._cached_encounter_list(pokemon_id)
            evolve_label = evolve_labels.get(pokemon_id)
            by_game: dict[str, dict[str, Any]] = {"home": {"text": "Pokémon HOME", "methods": ["home"]}}
            for game_key in games:
                labels = self._labels_from_encounters(raw, game_key)
                if evolve_label:
                    labels = [*labels, evolve_label]
                by_game[game_key] = {"text": " / ".join(labels), "methods": labels}
            await asyncio.to_thread(self._acquisition.upsert, pokemon_id, by_game)
            written += 1
        return written
