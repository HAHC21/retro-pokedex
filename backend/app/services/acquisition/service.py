"""Stored acquisition text for one species in one game."""

from __future__ import annotations

import asyncio
from typing import Any

from app.repositories.data_gap import ACQUISITION, DataGapRepository
from app.repositories.pokemon_acquisition import PokemonAcquisitionRepository


class AcquisitionService:
    def __init__(self) -> None:
        self._acquisition = PokemonAcquisitionRepository()
        self._gaps = DataGapRepository()

    async def acquisition(self, pokemon_id: int, game_key: str) -> dict[str, Any]:
        if game_key == "home":
            return {"text": "Pokémon HOME", "methods": ["home"]}
        stored = await asyncio.to_thread(self._acquisition.get, pokemon_id, game_key)
        if stored is None:
            await asyncio.to_thread(
                self._gaps.record,
                ACQUISITION,
                f"{pokemon_id}:{game_key}",
                resource_id=pokemon_id,
                game_key=game_key,
            )
            return {"text": "", "methods": []}
        return stored
