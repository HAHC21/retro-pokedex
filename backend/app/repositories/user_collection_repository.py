"""Persistence for per-user caught/shiny marks (game-scoped)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db.documents import UserCollectionMarkDocument


def _epoch_ms(value: Any) -> int | None:
    if value is None or value is False:
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


class UserCollectionRepository:
    def list_progress(self, user_id: str) -> dict[str, dict[str, dict[str, Any]]]:
        progress: dict[str, dict[str, dict[str, Any]]] = {}
        for doc in UserCollectionMarkDocument.objects(user_id=user_id):
            game = progress.setdefault(doc.game, {})
            entry: dict[str, Any] = {}
            if doc.caught:
                entry["caught"] = True
                entry["caughtAt"] = doc.caught_at
            if doc.shiny:
                entry["shiny"] = True
                entry["shinyAt"] = doc.shiny_at
            if entry:
                game[str(doc.pokemon_id)] = entry
        return progress

    def upsert_mark(
        self,
        *,
        user_id: str,
        game: str,
        pokemon_id: int,
        caught: bool = False,
        caught_at: int | None = None,
        shiny: bool = False,
        shiny_at: int | None = None,
    ) -> dict[str, Any] | None:
        game_key = game.strip()
        if not game_key or pokemon_id < 1:
            return None

        caught_flag = bool(caught)
        shiny_flag = bool(shiny)
        now = datetime.now(timezone.utc)

        if not caught_flag and not shiny_flag:
            UserCollectionMarkDocument.objects(
                user_id=user_id,
                game=game_key,
                pokemon_id=pokemon_id,
            ).delete()
            return None

        doc = UserCollectionMarkDocument.objects(
            user_id=user_id,
            game=game_key,
            pokemon_id=pokemon_id,
        ).first()
        if doc is None:
            doc = UserCollectionMarkDocument(
                user_id=user_id,
                game=game_key,
                pokemon_id=pokemon_id,
            )
        doc.caught = caught_flag
        doc.caught_at = _epoch_ms(caught_at) if caught_flag else None
        doc.shiny = shiny_flag
        doc.shiny_at = _epoch_ms(shiny_at) if shiny_flag else None
        doc.updated_at = now
        doc.save()
        return self._to_entry(doc)

    def replace_progress(self, user_id: str, progress: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
        UserCollectionMarkDocument.objects(user_id=user_id).delete()
        if isinstance(progress, dict):
            for game, marks in progress.items():
                if not isinstance(marks, dict):
                    continue
                for pokemon_id_raw, entry in marks.items():
                    if not isinstance(entry, dict):
                        continue
                    try:
                        pokemon_id = int(pokemon_id_raw)
                    except (TypeError, ValueError):
                        continue
                    self.upsert_mark(
                        user_id=user_id,
                        game=str(game),
                        pokemon_id=pokemon_id,
                        caught=bool(entry.get("caught")),
                        caught_at=_epoch_ms(entry.get("caughtAt")),
                        shiny=bool(entry.get("shiny")),
                        shiny_at=_epoch_ms(entry.get("shinyAt")),
                    )
        return self.list_progress(user_id)

    def merge_progress(self, user_id: str, progress: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
        """Union local/server marks: true wins; keep the newer timestamp when both set."""
        current = self.list_progress(user_id)
        if not isinstance(progress, dict):
            return current

        for game, marks in progress.items():
            if not isinstance(marks, dict):
                continue
            game_key = str(game)
            for pokemon_id_raw, incoming in marks.items():
                if not isinstance(incoming, dict):
                    continue
                try:
                    pokemon_id = int(pokemon_id_raw)
                except (TypeError, ValueError):
                    continue
                existing = (current.get(game_key) or {}).get(str(pokemon_id)) or {}
                merged = self._merge_entry(existing, incoming)
                self.upsert_mark(
                    user_id=user_id,
                    game=game_key,
                    pokemon_id=pokemon_id,
                    caught=bool(merged.get("caught")),
                    caught_at=_epoch_ms(merged.get("caughtAt")),
                    shiny=bool(merged.get("shiny")),
                    shiny_at=_epoch_ms(merged.get("shinyAt")),
                )
        return self.list_progress(user_id)

    @staticmethod
    def _merge_entry(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
        caught = bool(existing.get("caught")) or bool(incoming.get("caught"))
        shiny = bool(existing.get("shiny")) or bool(incoming.get("shiny"))
        caught_at = None
        shiny_at = None
        if caught:
            times = [t for t in (_epoch_ms(existing.get("caughtAt")), _epoch_ms(incoming.get("caughtAt"))) if t]
            caught_at = max(times) if times else None
        if shiny:
            times = [t for t in (_epoch_ms(existing.get("shinyAt")), _epoch_ms(incoming.get("shinyAt"))) if t]
            shiny_at = max(times) if times else None
        out: dict[str, Any] = {}
        if caught:
            out["caught"] = True
            out["caughtAt"] = caught_at
        if shiny:
            out["shiny"] = True
            out["shinyAt"] = shiny_at
        return out

    @staticmethod
    def _to_entry(doc: UserCollectionMarkDocument) -> dict[str, Any]:
        entry: dict[str, Any] = {}
        if doc.caught:
            entry["caught"] = True
            entry["caughtAt"] = doc.caught_at
        if doc.shiny:
            entry["shiny"] = True
            entry["shinyAt"] = doc.shiny_at
        return entry
