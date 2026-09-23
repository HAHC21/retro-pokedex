"""Persistence for Gemini-generated Pokémon lore overviews."""

from __future__ import annotations

from datetime import datetime, timezone

from app.db.documents import PokemonOverviewDocument


class PokemonOverviewRepository:
    def upsert(
        self,
        *,
        pokemon_id: int,
        name: str,
        overview: str,
        source: str = "gemini",
        model: str | None = None,
    ) -> PokemonOverviewDocument:
        now = datetime.now(timezone.utc)
        doc = PokemonOverviewDocument.objects(pokemon_id=pokemon_id).first()
        if doc is None:
            doc = PokemonOverviewDocument(pokemon_id=pokemon_id, generated_at=now)
        doc.name = name.strip()
        doc.overview = overview.strip()
        doc.source = source
        doc.model = model
        doc.updated_at = now
        if not doc.generated_at:
            doc.generated_at = now
        doc.save()
        return doc

    def get(self, pokemon_id: int) -> PokemonOverviewDocument | None:
        return PokemonOverviewDocument.objects(pokemon_id=pokemon_id).first()

    def overview_map(self) -> dict[int, str]:
        return {
            int(doc.pokemon_id): str(doc.overview)
            for doc in PokemonOverviewDocument.objects.only("pokemon_id", "overview")
            if doc.overview
        }

    def exists(self, pokemon_id: int) -> bool:
        return PokemonOverviewDocument.objects(pokemon_id=pokemon_id).count() > 0

    def existing_ids(self, pokemon_ids: list[int] | None = None) -> set[int]:
        query = PokemonOverviewDocument.objects
        if pokemon_ids is not None:
            query = query(pokemon_id__in=list(pokemon_ids))
        return {int(doc.pokemon_id) for doc in query.only("pokemon_id")}

    def count(self) -> int:
        return int(PokemonOverviewDocument.objects.count())
