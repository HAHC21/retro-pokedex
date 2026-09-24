"""Persistence for lore overviews, one per Pokémon database id."""

from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from app.db.documents import PokemonOverviewDocument
from app.repositories.pokemon_form_repository import PokemonRepository


class PokemonOverviewRepository:
    def __init__(self, pokemon: PokemonRepository | None = None) -> None:
        self._pokemon = pokemon or PokemonRepository()

    def upsert(
        self,
        *,
        pokemon: ObjectId,
        name: str,
        overview: str,
        source: str = "gemini",
        model: str | None = None,
    ) -> PokemonOverviewDocument:
        now = datetime.now(timezone.utc)
        doc = self.get(pokemon)
        if doc is None:
            doc = PokemonOverviewDocument(pokemon=pokemon, generated_at=now)
        doc.name = name.strip()
        doc.overview = overview.strip()
        doc.source = source
        doc.model = model
        doc.updated_at = now
        if not doc.generated_at:
            doc.generated_at = now
        doc.save()
        return doc

    def get(self, pokemon: ObjectId) -> PokemonOverviewDocument | None:
        return PokemonOverviewDocument.objects(pokemon=pokemon).first()

    def overview_map(self) -> dict[int, str]:
        """Base-form overviews keyed by Pokédex number, for the National Dex compile."""
        pokedex_by_id = self._pokemon.base_pokedex_ids()
        mapped: dict[int, str] = {}
        for doc in PokemonOverviewDocument.objects.only("pokemon", "overview"):
            pokedex_id = pokedex_by_id.get(doc.pokemon)
            if pokedex_id and doc.overview:
                mapped[pokedex_id] = str(doc.overview)
        return mapped

    def exists_for(self, pokemon: ObjectId) -> bool:
        return PokemonOverviewDocument.objects(pokemon=pokemon).count() > 0

    def existing_resource_ids(self, resource_ids: list[int]) -> set[int]:
        found: set[int] = set()
        for resource_id in resource_ids:
            row = self._pokemon.get_by_resource_id(resource_id)
            if row is not None and self.exists_for(row.id):
                found.add(resource_id)
        return found

    def count(self) -> int:
        return int(PokemonOverviewDocument.objects.count())
