"""Persistence for Gemini-suggested movesets."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db.documents import PokemonAiMovesetDocument


class PokemonAiMovesetRepository:
    def get(self, pokemon_id: int, game: str, form: str = "base") -> PokemonAiMovesetDocument | None:
        doc = PokemonAiMovesetDocument.objects(pokemon_id=pokemon_id, game=game, form=form).first()
        if doc is None and form == "base":
            doc = PokemonAiMovesetDocument.objects(pokemon_id=pokemon_id, game=game, form__exists=False).first()
        return doc

    def upsert(
        self,
        *,
        pokemon_id: int,
        game: str,
        form: str = "base",
        available: bool,
        provider: str | None,
        model: str | None,
        message: str | None,
        sets: list[dict[str, Any]],
    ) -> PokemonAiMovesetDocument:
        now = datetime.now(timezone.utc)
        doc = self.get(pokemon_id, game, form)
        if doc is None:
            doc = PokemonAiMovesetDocument(pokemon_id=pokemon_id, game=game, form=form, generated_at=now)
        doc.available = bool(available)
        doc.provider = provider
        doc.model = model
        doc.message = message
        doc.sets = list(sets)
        doc.updated_at = now
        if not doc.generated_at:
            doc.generated_at = now
        doc.save()
        return doc

    def to_payload(self, doc: PokemonAiMovesetDocument) -> dict[str, Any]:
        return {
            "game": doc.game,
            "pokemon_id": int(doc.pokemon_id),
            "available": bool(doc.available),
            "provider": doc.provider,
            "message": doc.message,
            "sets": list(doc.sets or []),
            "cached": True,
            "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        }
