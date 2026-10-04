"""Homepage region bands. These are not a game's regional Pokédex."""

from __future__ import annotations

from typing import Any

from app.db.app.region_document import RegionDocument


class RegionRepository:
    def list_payload(self) -> list[dict[str, Any]]:
        return [
            {
                "slug": str(doc.slug),
                "name": str(doc.name),
                "from": int(doc.national_from),
                "to": int(doc.national_to),
                "games": str(doc.games),
                "mascots": [int(pokemon_id) for pokemon_id in (doc.mascots or [])],
            }
            for doc in RegionDocument.objects.order_by("national_from")
        ]

    def replace_all(self, rows: list[dict[str, Any]]) -> int:
        RegionDocument.objects.delete()
        docs = [
            RegionDocument(
                slug=str(row["slug"]),
                name=str(row["name"]),
                national_from=int(row["from"]),
                national_to=int(row["to"]),
                games=str(row["games"]),
                mascots=[int(pokemon_id) for pokemon_id in (row.get("mascots") or [])],
            )
            for row in rows
        ]
        if docs:
            RegionDocument.objects.insert(docs, load_bulk=False)
        return len(docs)
