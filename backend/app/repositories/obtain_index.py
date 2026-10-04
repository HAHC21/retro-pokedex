"""Persisted National Dex obtainability index (slim singleton document)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.app.obtain_index_document import ObtainIndexDocument

NATIONAL_KEY = "national"


class ObtainIndexRepository:
    """Read/write the precomputed obtain index served by GET /obtainability."""

    def get(self, *, min_count: int = 1) -> dict[str, Any] | None:
        doc = ObtainIndexDocument.objects(key=NATIONAL_KEY).first()
        if doc is None or int(doc.count or 0) < min_count:
            return None
        return {
            "count": int(doc.count),
            "versions": dict(doc.versions or {}),
            "evolves_from": {
                key: (int(parent) if parent is not None else None)
                for key, parent in (doc.evolves_from or {}).items()
            },
        }

    def meta_for(self, pokemon_id: int, *, min_count: int = 1) -> dict[str, Any] | None:
        """Single-id slice of the slim index; omitted keys → empty versions / null parent."""
        index = self.get(min_count=min_count)
        if index is None:
            return None
        key = str(pokemon_id)
        parent = index["evolves_from"].get(key)
        return {
            "versions": list(index["versions"].get(key) or []),
            "evolves_from": int(parent) if parent is not None else None,
        }

    def upsert(
        self,
        *,
        count: int,
        versions: dict[str, list[str]],
        evolves_from: dict[str, int],
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        payload = {
            "count": count,
            "versions": versions,
            "evolves_from": evolves_from,
        }
        try:
            ObtainIndexDocument.objects(key=NATIONAL_KEY).modify(
                upsert=True,
                new=True,
                set__count=count,
                set__versions=versions,
                set__evolves_from=evolves_from,
                set__built_at=now,
                set_on_insert__key=NATIONAL_KEY,
            )
        except NotUniqueError:
            ObtainIndexDocument.objects(key=NATIONAL_KEY).modify(
                new=True,
                set__count=count,
                set__versions=versions,
                set__evolves_from=evolves_from,
                set__built_at=now,
            )
        return payload
