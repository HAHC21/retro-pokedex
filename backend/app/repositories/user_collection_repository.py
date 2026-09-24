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
                if doc.caught_male:
                    entry["caughtMale"] = True
                if doc.caught_female:
                    entry["caughtFemale"] = True
            if doc.shiny:
                entry["shiny"] = True
                entry["shinyAt"] = doc.shiny_at
                if doc.shiny_male:
                    entry["shinyMale"] = True
                if doc.shiny_female:
                    entry["shinyFemale"] = True
            if entry:
                game[self._progress_key(int(doc.pokemon_id), getattr(doc, "form", None) or "base")] = entry
        return progress

    @staticmethod
    def _progress_key(pokemon_id: int, form: str) -> str:
        return str(pokemon_id) if form == "base" else f"{pokemon_id}:{form}"

    @staticmethod
    def _parse_mark_key(raw: str) -> tuple[int, str] | None:
        pokedex, separator, form = raw.partition(":")
        try:
            pokemon_id = int(pokedex)
        except (TypeError, ValueError):
            return None
        if pokemon_id < 1:
            return None
        return pokemon_id, form if separator else "base"

    def upsert_mark(
        self,
        *,
        user_id: str,
        game: str,
        pokemon_id: int,
        form: str = "base",
        caught: bool = False,
        caught_at: int | None = None,
        caught_male: bool = False,
        caught_female: bool = False,
        shiny: bool = False,
        shiny_at: int | None = None,
        shiny_male: bool = False,
        shiny_female: bool = False,
    ) -> dict[str, Any] | None:
        game_key = game.strip()
        if not game_key or pokemon_id < 1:
            return None

        caught_flag = bool(caught)
        shiny_flag = bool(shiny)
        now = datetime.now(timezone.utc)

        form_key = form or "base"
        doc = UserCollectionMarkDocument.objects(
            user_id=user_id,
            game=game_key,
            pokemon_id=pokemon_id,
            form=form_key,
        ).first()
        if doc is None and form_key == "base":
            doc = UserCollectionMarkDocument.objects(
                user_id=user_id,
                game=game_key,
                pokemon_id=pokemon_id,
                form__exists=False,
            ).first()
        if not caught_flag and not shiny_flag:
            if doc is not None:
                doc.delete()
            return None
        if doc is None:
            doc = UserCollectionMarkDocument(
                user_id=user_id,
                game=game_key,
                pokemon_id=pokemon_id,
                form=form_key,
            )
        doc.form = form_key
        doc.caught = caught_flag
        doc.caught_at = _epoch_ms(caught_at) if caught_flag else None
        doc.caught_male = bool(caught_male) if caught_flag else False
        doc.caught_female = bool(caught_female) if caught_flag else False
        doc.shiny = shiny_flag
        doc.shiny_at = _epoch_ms(shiny_at) if shiny_flag else None
        doc.shiny_male = bool(shiny_male) if shiny_flag else False
        doc.shiny_female = bool(shiny_female) if shiny_flag else False
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
                    parsed = self._parse_mark_key(str(pokemon_id_raw))
                    if parsed is None:
                        continue
                    pokemon_id, form = parsed
                    self.upsert_mark(
                        user_id=user_id,
                        game=str(game),
                        pokemon_id=pokemon_id,
                        form=form,
                        caught=bool(entry.get("caught")),
                        caught_at=_epoch_ms(entry.get("caughtAt")),
                        caught_male=bool(entry.get("caughtMale")),
                        caught_female=bool(entry.get("caughtFemale")),
                        shiny=bool(entry.get("shiny")),
                        shiny_at=_epoch_ms(entry.get("shinyAt")),
                        shiny_male=bool(entry.get("shinyMale")),
                        shiny_female=bool(entry.get("shinyFemale")),
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
                parsed = self._parse_mark_key(str(pokemon_id_raw))
                if parsed is None:
                    continue
                pokemon_id, form = parsed
                existing = (current.get(game_key) or {}).get(self._progress_key(pokemon_id, form)) or {}
                merged = self._merge_entry(existing, incoming)
                self.upsert_mark(
                    user_id=user_id,
                    game=game_key,
                    pokemon_id=pokemon_id,
                    form=form,
                    caught=bool(merged.get("caught")),
                    caught_at=_epoch_ms(merged.get("caughtAt")),
                    caught_male=bool(merged.get("caughtMale")),
                    caught_female=bool(merged.get("caughtFemale")),
                    shiny=bool(merged.get("shiny")),
                    shiny_at=_epoch_ms(merged.get("shinyAt")),
                    shiny_male=bool(merged.get("shinyMale")),
                    shiny_female=bool(merged.get("shinyFemale")),
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
            if existing.get("caughtMale") or incoming.get("caughtMale"):
                out["caughtMale"] = True
            if existing.get("caughtFemale") or incoming.get("caughtFemale"):
                out["caughtFemale"] = True
        if shiny:
            out["shiny"] = True
            out["shinyAt"] = shiny_at
            if existing.get("shinyMale") or incoming.get("shinyMale"):
                out["shinyMale"] = True
            if existing.get("shinyFemale") or incoming.get("shinyFemale"):
                out["shinyFemale"] = True
        return out

    @staticmethod
    def _to_entry(doc: UserCollectionMarkDocument) -> dict[str, Any]:
        entry: dict[str, Any] = {}
        if doc.caught:
            entry["caught"] = True
            entry["caughtAt"] = doc.caught_at
            if doc.caught_male:
                entry["caughtMale"] = True
            if doc.caught_female:
                entry["caughtFemale"] = True
        if doc.shiny:
            entry["shiny"] = True
            entry["shinyAt"] = doc.shiny_at
            if doc.shiny_male:
                entry["shinyMale"] = True
            if doc.shiny_female:
                entry["shinyFemale"] = True
        return entry
