"""Compiled National Dex display-name map (slim singleton)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.app.pokemon_names_document import PokemonNamesDocument

NATIONAL_KEY = "national"


class PokemonNamesRepository:
    """Read/write the precomputed name index served by GET /index."""

    def get(self, *, min_count: int = 1) -> dict[str, str] | None:
        doc = PokemonNamesDocument.objects(key=NATIONAL_KEY).first()
        if doc is None or int(doc.count or 0) < min_count:
            return None
        return {str(key): str(value) for key, value in (doc.names or {}).items()}

    def count(self) -> int:
        doc = PokemonNamesDocument.objects(key=NATIONAL_KEY).only("count").first()
        return int(doc.count) if doc is not None else 0

    def upsert(self, *, count: int, names: dict[str, str]) -> dict[str, str]:
        now = datetime.now(timezone.utc)
        try:
            PokemonNamesDocument.objects(key=NATIONAL_KEY).modify(
                upsert=True,
                new=True,
                set__count=count,
                set__names=names,
                set__built_at=now,
                set_on_insert__key=NATIONAL_KEY,
            )
        except NotUniqueError:
            PokemonNamesDocument.objects(key=NATIONAL_KEY).modify(
                new=True,
                set__count=count,
                set__names=names,
                set__built_at=now,
            )
        return names

    def upsert_from_species_list(self, payload: dict[str, Any] | None, *, limit: int) -> dict[str, str]:
        names: dict[str, str] = {}
        results = (payload or {}).get("results") or []
        for index, entry in enumerate(results[:limit]):
            raw_name = (entry.get("name") or "") if isinstance(entry, dict) else ""
            names[str(index + 1)] = _title(raw_name)
        return self.upsert(count=len(names), names=names)


def _title(value: str) -> str:
    if not value:
        return ""
    return "-".join(part[:1].upper() + part[1:] for part in value.split("-") if part)
