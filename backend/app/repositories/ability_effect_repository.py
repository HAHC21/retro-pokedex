"""Compiled English ability effect text."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db.documents import AbilityEffectDocument

_CHUNK = 200


class AbilityEffectRepository:
    def get(self, ability_name: str) -> str | None:
        doc = AbilityEffectDocument.objects(ability_name=ability_name).first()
        if doc is None:
            return None
        return doc.description

    def get_map(self, names: list[str] | None = None) -> dict[str, str | None]:
        query = AbilityEffectDocument.objects
        if names is not None:
            query = query(ability_name__in=list(names))
        return {str(doc.ability_name): doc.description for doc in query.only("ability_name", "description")}

    def count(self) -> int:
        return int(AbilityEffectDocument.objects.count())

    def replace_all(self, rows: list[dict[str, Any]]) -> int:
        AbilityEffectDocument.objects.delete()
        now = datetime.now(timezone.utc)
        docs = [
            AbilityEffectDocument(
                ability_name=str(row["ability_name"]),
                description=row.get("description"),
                built_at=now,
            )
            for row in rows
            if row.get("ability_name")
        ]
        for index in range(0, len(docs), _CHUNK):
            chunk = docs[index : index + _CHUNK]
            if chunk:
                AbilityEffectDocument.objects.insert(chunk, load_bulk=False)
        return len(docs)
