"""National Dex generation bands."""

from __future__ import annotations

from typing import Any

from app.db.app.generation_document import GenerationDocument


class GenerationRepository:
    def list_payload(self) -> list[dict[str, Any]]:
        docs = GenerationDocument.objects.order_by("generation_id")
        return [
            {
                "id": int(doc.generation_id),
                "roman": str(doc.roman),
                "from": int(doc.national_from),
                "to": int(doc.national_to),
                "games": str(doc.games),
            }
            for doc in docs
        ]

    def replace_all(self, rows: list[dict[str, Any]]) -> int:
        GenerationDocument.objects.delete()
        docs = [
            GenerationDocument(
                generation_id=int(row["id"]),
                roman=str(row["roman"]),
                national_from=int(row["from"]),
                national_to=int(row["to"]),
                games=str(row["games"]),
            )
            for row in rows
        ]
        if docs:
            GenerationDocument.objects.insert(docs, load_bulk=False)
        return len(docs)
