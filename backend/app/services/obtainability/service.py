"""Stored obtain index."""

from __future__ import annotations

import asyncio
from typing import Any

from app.repositories.data_gap import OBTAIN_INDEX, DataGapRepository
from app.repositories.obtain_index import ObtainIndexRepository


class ObtainabilityService:
    def __init__(self) -> None:
        self._index = ObtainIndexRepository()
        self._gaps = DataGapRepository()

    async def obtain_index(self, *, limit: int = 1025) -> dict[str, Any]:
        stored = await asyncio.to_thread(self._index.get, min_count=limit)
        if stored is None:
            await asyncio.to_thread(self._gaps.record, OBTAIN_INDEX, "national")
            return {"count": 0, "versions": {}, "evolves_from": {}}
        return stored

    async def obtain_meta(self, pokemon_id: int) -> dict[str, Any]:
        meta = await asyncio.to_thread(self._index.meta_for, pokemon_id, min_count=1)
        if meta is None:
            await asyncio.to_thread(self._gaps.record, OBTAIN_INDEX, "national")
            return {"versions": [], "evolves_from": None}
        return meta
