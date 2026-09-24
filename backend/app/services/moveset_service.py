"""Smogon + AI recommended movesets for the Moves tab."""

from __future__ import annotations

import asyncio
from typing import Any

from app.catalog.smogon import smogon_format_ids, to_smogon_species_name
from app.integrations.gemini.client import GeminiMovesetClient
from app.integrations.pokeapi.client import PokeApiClient
from app.integrations.smogon.client import SmogonSetsClient
from app.repositories.move_repository import MoveRepository
from app.repositories.pokemon_ai_moveset_repository import PokemonAiMovesetRepository
from app.repositories.pokemon_form_repository import PokemonRepository
from app.services.learnset_service import build_learnset
from app.services.moveset_normalize import (
    filter_ai_set,
    find_species_sets,
    normalize_smogon_set,
    species_name_candidates,
)

GAME_LABELS: dict[str, str] = {
    "rb": "Red / Blue",
    "y": "Yellow",
    "gs": "Gold / Silver",
    "c": "Crystal",
    "rs": "Ruby / Sapphire",
    "e": "Emerald",
    "frlg": "FireRed / LeafGreen",
    "dp": "Diamond / Pearl",
    "pt": "Platinum",
    "hgss": "HeartGold / SoulSilver",
    "bw": "Black / White",
    "b2w2": "Black 2 / White 2",
    "xy": "X / Y",
    "oras": "Omega Ruby / Alpha Sapphire",
    "sm": "Sun / Moon",
    "usum": "Ultra Sun / Ultra Moon",
    "swsh": "Sword / Shield",
    "bdsp": "Brilliant Diamond / Shining Pearl",
    "pla": "Legends: Arceus",
    "sv": "Scarlet / Violet",
    "home": "Pokémon HOME",
}

GAME_GENERATIONS: dict[str, int] = {
    "rb": 1,
    "y": 1,
    "gs": 2,
    "c": 2,
    "rs": 3,
    "e": 3,
    "frlg": 3,
    "dp": 4,
    "pt": 4,
    "hgss": 4,
    "bw": 5,
    "b2w2": 5,
    "xy": 6,
    "oras": 6,
    "sm": 7,
    "usum": 7,
    "swsh": 8,
    "bdsp": 8,
    "pla": 8,
    "sv": 9,
}


def _id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1] or "0")


def _title(value: str) -> str:
    if not value:
        return ""
    return "-".join(part[:1].upper() + part[1:] for part in value.split("-") if part)


GEMINI_UNAVAILABLE_MESSAGE = "We apologize, AI suggestions by Gemini is not available right now."


class MovesetService:
    def __init__(
        self,
        pokeapi: PokeApiClient,
        smogon: SmogonSetsClient,
        gemini: GeminiMovesetClient,
        moves: MoveRepository | None = None,
        ai_movesets: PokemonAiMovesetRepository | None = None,
    ) -> None:
        self._pokeapi = pokeapi
        self._smogon = smogon
        self._gemini = gemini
        self._moves = moves or MoveRepository()
        self._ai_movesets = ai_movesets or PokemonAiMovesetRepository()
        self._pokemon = PokemonRepository()

    def _form_slot(self, resource_id: int) -> tuple[int, str]:
        row = self._pokemon.get_by_resource_id(resource_id)
        if row is None:
            return resource_id, "base"
        return int(row.pokedex_id), row.form

    async def _cached_moveset(self, resource_id: int, game_key: str) -> PokemonAiMovesetDocument | None:
        pokedex_id, form = await asyncio.to_thread(self._form_slot, resource_id)
        cached = await asyncio.to_thread(self._ai_movesets.get, pokedex_id, game_key, form)
        if cached is None and (form.startswith("mega") or form == "gigantamax"):
            cached = await asyncio.to_thread(self._ai_movesets.get, pokedex_id, game_key, "base")
        return cached

    async def smogon_movesets(self, pokemon_id: int, game_key: str) -> dict[str, Any]:
        data = await self._pokeapi.get_pokemon(pokemon_id)
        if data is None:
            raise KeyError(pokemon_id)
        slug = data.get("name") or ""
        species_slug = ((data.get("species") or {}).get("name") or "").strip()
        candidates = species_name_candidates(slug, species_slug)
        formats_tried: list[str] = []
        for format_id in smogon_format_ids(game_key):
            formats_tried.append(format_id)
            payload = await self._smogon.get_format_sets(format_id)
            if not payload:
                continue
            for species in candidates:
                found = find_species_sets(payload, species)
                if not found:
                    continue
                tier, sets_map = found
                format_label = f"{format_id}/{tier}" if tier else format_id
                sets = [
                    normalize_smogon_set(name, raw, format_id=format_label)
                    for name, raw in sets_map.items()
                    if isinstance(raw, dict)
                ]
                if not sets:
                    continue
                return {
                    "game": game_key,
                    "pokemon_id": pokemon_id,
                    "species": species,
                    "format": format_label,
                    "attribution": "Smogon University / data.pkmn.cc",
                    "attribution_url": "https://www.smogon.com/",
                    "sets": sets[:6],
                    "formats_tried": formats_tried,
                }
        display = to_smogon_species_name(species_slug or slug)
        return {
            "game": game_key,
            "pokemon_id": pokemon_id,
            "species": display,
            "format": None,
            "attribution": "Smogon University / data.pkmn.cc",
            "attribution_url": "https://www.smogon.com/",
            "sets": [],
            "formats_tried": formats_tried,
        }

    async def ai_movesets(self, pokemon_id: int, game_key: str, *, force: bool = False) -> dict[str, Any]:
        if not force:
            cached = await self._cached_moveset(pokemon_id, game_key)
            if cached is not None:
                return self._ai_movesets.to_payload(cached)

        if not self._gemini.available:
            return {
                "game": game_key,
                "pokemon_id": pokemon_id,
                "available": False,
                "provider": None,
                "message": GEMINI_UNAVAILABLE_MESSAGE,
                "sets": [],
                "cached": False,
            }

        result = await self._generate_ai_movesets(pokemon_id, game_key)
        # Persist successful generations and stable "not enough moves" outcomes.
        # Do not persist transient Gemini failures so a later request can retry.
        if result.get("available") or result.get("sets") or (
            result.get("message") and "Not enough learnset" in str(result.get("message"))
        ):
            pokedex_id, form = await asyncio.to_thread(self._form_slot, pokemon_id)
            doc = await asyncio.to_thread(
                self._ai_movesets.upsert,
                pokemon_id=pokedex_id,
                game=game_key,
                form=form,
                available=bool(result.get("available")),
                provider=result.get("provider"),
                model=self._gemini.provider_label,
                message=result.get("message"),
                sets=list(result.get("sets") or []),
            )
            return self._ai_movesets.to_payload(doc)

        if force:
            cached = await self._cached_moveset(pokemon_id, game_key)
            if cached is not None:
                payload = self._ai_movesets.to_payload(cached)
                payload["refresh_failed"] = True
                payload["message"] = result.get("message") or GEMINI_UNAVAILABLE_MESSAGE
                return payload
        return result

    async def _generate_ai_movesets(self, pokemon_id: int, game_key: str) -> dict[str, Any]:
        data = await self._pokeapi.get_pokemon(pokemon_id)
        if data is None:
            raise KeyError(pokemon_id)

        move_ids = [_id_from_url(((entry.get("move") or {}).get("url") or "")) for entry in data.get("moves") or []]
        moves_by_id = await asyncio.to_thread(self._moves.get_by_ids, move_ids)
        groups = build_learnset(data, game_key, moves_by_id)
        allowed: list[str] = []
        seen: set[str] = set()
        for group in groups:
            for move in group.get("moves") or []:
                name = move.get("name") or ""
                if name and name.casefold() not in seen:
                    seen.add(name.casefold())
                    allowed.append(name)
        if len(allowed) < 4:
            return {
                "game": game_key,
                "pokemon_id": pokemon_id,
                "available": True,
                "provider": self._gemini.provider_label,
                "message": "Not enough learnset moves to build a set for this game.",
                "sets": [],
                "cached": False,
            }

        types = [_title((t.get("type") or {}).get("name") or "") for t in data.get("types") or []]
        species_slug = ((data.get("species") or {}).get("name") or data.get("name") or "")
        species = _title(species_slug)
        game_label = GAME_LABELS.get(game_key, game_key)
        generation = GAME_GENERATIONS.get(game_key)
        try:
            raw_sets = await self._gemini.suggest_movesets(
                pokemon_name=species,
                game_key=game_key,
                game_label=game_label,
                generation=generation,
                types=[t for t in types if t],
                allowed_moves=allowed,
            )
        except Exception:
            return {
                "game": game_key,
                "pokemon_id": pokemon_id,
                "available": False,
                "provider": self._gemini.provider_label,
                "message": GEMINI_UNAVAILABLE_MESSAGE,
                "sets": [],
                "cached": False,
            }
        allow_set = set(allowed)
        sets = []
        for raw in raw_sets:
            filtered = filter_ai_set(raw, allowed_moves=allow_set)
            if filtered:
                sets.append(filtered)

        return {
            "game": game_key,
            "pokemon_id": pokemon_id,
            "available": True,
            "provider": self._gemini.provider_label,
            "message": None if sets else GEMINI_UNAVAILABLE_MESSAGE,
            "sets": sets[:2],
            "cached": False,
        }
