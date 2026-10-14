"""Stored species page. Capture, overview, and stats are joined from the form row."""

from __future__ import annotations

import asyncio
from typing import Any

from app.db.app.pokemon_document import PokemonDocument
from app.repositories.data_gap import DETAIL, FORM, DataGapRepository
from app.repositories.pokemon_detail_view import PokemonDetailViewRepository
from app.repositories.pokemon_form import PokemonRepository
from app.repositories.pokemon_overview import PokemonOverviewRepository, overview_texts
from app.services.pokemon_detail.helpers import apply_stored_stats


class PokemonDetailService:
    def __init__(self) -> None:
        self._pokemon = PokemonRepository()
        self._details = PokemonDetailViewRepository()
        self._overviews = PokemonOverviewRepository()
        self._gaps = DataGapRepository()

    async def pokemon_detail(self, resource_id: int) -> dict[str, Any] | None:
        record = await asyncio.to_thread(self._pokemon.get_by_resource_id, resource_id)
        if record is None:
            await asyncio.to_thread(self._gaps.record, FORM, str(resource_id), resource_id=resource_id)
            await asyncio.to_thread(self._gaps.record, DETAIL, str(resource_id), resource_id=resource_id)
            return None
        form = str(record.form or "base")
        pokedex_id = int(record.pokedex_id)
        stored = await asyncio.to_thread(self._details.get, pokedex_id, form)
        if stored is None or "games" not in stored:
            await asyncio.to_thread(
                self._gaps.record,
                DETAIL,
                str(resource_id),
                resource_id=resource_id,
                form=form,
            )
        if stored is None:
            return None
        return await asyncio.to_thread(self._overlay, record, stored)

    def _overlay(self, record: PokemonDocument, payload: dict[str, Any]) -> dict[str, Any]:
        overview_doc = self._overviews.get(record.id)
        payload = {**payload, "overview": overview_texts(overview_doc), "capture": bool(record.capture)}
        if record.types:
            data = dict(payload.get("data") or {})
            data["types"] = [{"type": {"name": name}} for name in record.types]
            payload = {**payload, "data": data}
        return apply_stored_stats(payload, record)
