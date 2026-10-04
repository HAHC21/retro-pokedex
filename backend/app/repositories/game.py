"""Stored save slots. Seeded by the compile script; read by compile and by regional dex."""

from __future__ import annotations

from typing import Any

from app.db.app.game_document import GameDocument


def _row(doc: GameDocument) -> dict[str, Any]:
    return {
        "key": str(doc.key),
        "label": str(doc.label),
        "generation": int(doc.generation) if doc.generation is not None else None,
        "versions": None if doc.all_versions else [str(name) for name in (doc.versions or [])],
        "pokedexes": [str(name) for name in (doc.pokedexes or [])],
        "version_groups": None if doc.all_version_groups else [str(name) for name in (doc.version_groups or [])],
        "all_versions": bool(doc.all_versions),
        "all_version_groups": bool(doc.all_version_groups),
    }


class GameRepository:
    def get(self, key: str) -> dict[str, Any] | None:
        doc = GameDocument.objects(key=key).first()
        if doc is None:
            return None
        return _row(doc)

    def list_all(self) -> list[dict[str, Any]]:
        return [_row(doc) for doc in GameDocument.objects.order_by("key")]

    def replace_all(self, rows: list[dict[str, Any]]) -> int:
        GameDocument.objects.delete()
        docs = [
            GameDocument(
                key=str(row["key"]),
                label=str(row["label"]),
                generation=row.get("generation"),
                all_versions=row.get("versions") is None,
                versions=list(row.get("versions") or []),
                pokedexes=list(row.get("pokedexes") or []),
                all_version_groups=row.get("version_groups") is None,
                version_groups=list(row.get("version_groups") or []),
            )
            for row in rows
        ]
        if docs:
            GameDocument.objects.insert(docs, load_bulk=False)
        return len(docs)
