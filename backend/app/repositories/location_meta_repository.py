"""Compiled location-area → location + region labels."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db.documents import LocationMetaDocument


class LocationMetaRepository:
    def get_map(self) -> dict[str, dict[str, str | None]]:
        """area_name → {loc_name, region}."""
        result: dict[str, dict[str, str | None]] = {}
        for doc in LocationMetaDocument.objects.only("area_name", "loc_name", "region"):
            result[str(doc.area_name)] = {
                "loc_name": doc.loc_name,
                "region": doc.region,
            }
        return result

    def count(self) -> int:
        return int(LocationMetaDocument.objects.count())

    def replace_all(self, rows: list[dict[str, Any]]) -> int:
        LocationMetaDocument.objects.delete()
        now = datetime.now(timezone.utc)
        docs = [
            LocationMetaDocument(
                area_name=str(row["area_name"]),
                area_id=row.get("area_id"),
                loc_name=row.get("loc_name"),
                region=row.get("region"),
                built_at=now,
            )
            for row in rows
            if row.get("area_name")
        ]
        if docs:
            LocationMetaDocument.objects.insert(docs, load_bulk=False)
        return len(docs)
