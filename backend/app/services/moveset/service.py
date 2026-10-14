"""Smogon + AI recommended movesets for the Moves tab."""

from __future__ import annotations

import asyncio
from typing import Any

from app.catalog.smogon import smogon_format_ids, to_smogon_species_name
from app.db.app.pokemon_ai_moveset_document import PokemonAiMovesetDocument
from app.integrations.gemini.client import GeminiMovesetClient
from app.integrations.smogon.client import SmogonSetsClient
from app.repositories.data_gap import FORM, LEARNSET, DataGapRepository
from app.repositories.game import GameRepository
from app.repositories.move import MoveRepository
from app.repositories.pokemon_ai_moveset import PokemonAiMovesetRepository
from app.repositories.pokemon_form import PokemonRepository
from app.repositories.pokemon_learnset import PokemonLearnsetRepository
from app.services.moveset.const import GEMINI_UNAVAILABLE_MESSAGE
from app.services.moveset.helpers import (
    filter_ai_set,
    find_species_sets,
    normalize_smogon_set,
    species_name_candidates,
    title,
)
from app.catalog.pokemon_form import stores_learnset


def _slug(name: str) -> str:
    return name.strip().lower().replace(" ", "-")


class MovesetService:
    def __init__(
        self,
        smogon: SmogonSetsClient,
        gemini: GeminiMovesetClient,
        moves: MoveRepository | None = None,
        ai_movesets: PokemonAiMovesetRepository | None = None,
    ) -> None:
        self._smogon = smogon
        self._gemini = gemini
        self._moves = moves or MoveRepository()
        self._ai_movesets = ai_movesets or PokemonAiMovesetRepository()
        self._pokemon = PokemonRepository()
        self._learnsets = PokemonLearnsetRepository()
        self._games = GameRepository()
        self._gaps = DataGapRepository()

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

    async def _names_for(self, resource_id: int) -> tuple[Any, str, str]:
        record = await asyncio.to_thread(self._pokemon.get_by_resource_id, resource_id)
        if record is None:
            await asyncio.to_thread(self._gaps.record, FORM, str(resource_id), resource_id=resource_id)
            raise KeyError(resource_id)
        base = record
        if str(record.form or "") != "base":
            found = await asyncio.to_thread(self._pokemon.get, int(record.pokedex_id), "base")
            if found is not None:
                base = found
        return record, _slug(str(record.name or "")), _slug(str(base.name or ""))

    async def smogon_movesets(self, pokemon_id: int, game_key: str) -> dict[str, Any]:
        _record, slug, species_slug = await self._names_for(pokemon_id)
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
        record, _slug_name, species_slug = await self._names_for(pokemon_id)
        form = str(record.form or "base")
        target_id = int(record.resource_id)
        if not stores_learnset(form):
            base = await asyncio.to_thread(self._pokemon.get, int(record.pokedex_id), "base")
            if base is None:
                raise KeyError(pokemon_id)
            target_id = int(base.resource_id)
        groups = await asyncio.to_thread(self._learnsets.get, target_id, game_key)
        if groups is None:
            if stores_learnset(form):
                await asyncio.to_thread(
                    self._gaps.record,
                    LEARNSET,
                    f"{target_id}:{game_key}",
                    resource_id=target_id,
                    game_key=game_key,
                    form=form if stores_learnset(form) else "base",
                )
            groups = []
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

        types = [title(str(name)) for name in (record.types or [])]
        species = title(species_slug)
        game = await asyncio.to_thread(self._games.get, game_key)
        game_label = str(game["label"]) if game else game_key
        generation = game["generation"] if game else None
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
