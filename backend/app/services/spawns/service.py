"""Stored wild encounters."""

from __future__ import annotations

import asyncio
from typing import Any

from app.repositories.data_gap import FORM, SPAWNS, DataGapRepository
from app.repositories.pokemon_form import PokemonRepository
from app.repositories.pokemon_spawns import PokemonSpawnsRepository


class SpawnsService:
    def __init__(self) -> None:
        self._pokemon = PokemonRepository()
        self._spawns = PokemonSpawnsRepository()
        self._gaps = DataGapRepository()

    async def pokemon_spawns(self, resource_id: int) -> dict[str, Any]:
        record = await asyncio.to_thread(self._pokemon.get_by_resource_id, resource_id)
        if record is None:
            await asyncio.to_thread(self._gaps.record, FORM, str(resource_id), resource_id=resource_id)
            await asyncio.to_thread(self._gaps.record, SPAWNS, str(resource_id), resource_id=resource_id)
            return {"enc": []}
        pokedex_id = int(record.pokedex_id)
        form = str(record.form or "base")
        stored = await asyncio.to_thread(self._spawns.get, pokedex_id, form)
        if stored is None and (form.startswith("mega") or form == "gigantamax"):
            stored = await asyncio.to_thread(self._spawns.get, pokedex_id, "base")
        if stored is None:
            await asyncio.to_thread(
                self._gaps.record,
                SPAWNS,
                str(resource_id),
                resource_id=resource_id,
                form=form,
            )
            return {"enc": []}
        return {"enc": stored}
