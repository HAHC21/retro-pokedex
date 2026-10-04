"""Stored learnsets. Mega and Gigantamax pages use the base species row."""

from __future__ import annotations

import asyncio
from typing import Any

from app.repositories.data_gap import FORM, LEARNSET, DataGapRepository
from app.repositories.move import MoveRepository
from app.repositories.pokemon_form import PokemonRepository
from app.repositories.pokemon_learnset import PokemonLearnsetRepository
from app.services.poke_compile.helpers import stores_learnset


class PokemonLearnsetService:
    def __init__(self) -> None:
        self._pokemon = PokemonRepository()
        self._learnsets = PokemonLearnsetRepository()
        self._moves = MoveRepository()
        self._gaps = DataGapRepository()

    async def learnset(self, resource_id: int, game_key: str) -> dict[str, Any]:
        record = await asyncio.to_thread(self._pokemon.get_by_resource_id, resource_id)
        if record is None:
            await asyncio.to_thread(self._gaps.record, FORM, str(resource_id), resource_id=resource_id)
            raise KeyError(resource_id)
        form = str(record.form or "base")
        target_id = int(record.resource_id)
        target_form = form
        if not stores_learnset(form):
            base = await asyncio.to_thread(self._pokemon.get, int(record.pokedex_id), "base")
            if base is None:
                await asyncio.to_thread(
                    self._gaps.record,
                    FORM,
                    f"{int(record.pokedex_id)}:base",
                    resource_id=int(record.pokedex_id),
                    form="base",
                )
                raise KeyError(resource_id)
            target_id = int(base.resource_id)
            target_form = "base"
        groups = await asyncio.to_thread(self._learnsets.get, target_id, game_key)
        if groups is None and stores_learnset(form):
            await asyncio.to_thread(
                self._gaps.record,
                LEARNSET,
                f"{target_id}:{game_key}",
                resource_id=target_id,
                game_key=game_key,
                form=target_form,
            )
            groups = []
        catalog_count = await asyncio.to_thread(self._moves.count)
        return {"game": game_key, "groups": groups or [], "catalog_count": catalog_count}
