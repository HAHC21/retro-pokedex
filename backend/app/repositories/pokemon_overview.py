"""Persistence for lore overviews, one per Pokémon database id."""

from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from app.db.app.pokemon_overview_document import PokemonOverviewDocument
from app.repositories.pokemon_form import PokemonRepository

OverviewLanguage = str


def overview_texts(doc: PokemonOverviewDocument | None) -> dict[str, str] | None:
    """English and Spanish paragraphs. English is the stored ``overview`` field."""
    if doc is None:
        return None
    english = (doc.overview or "").strip()
    spanish = (doc.overview_es or "").strip()
    texts: dict[str, str] = {}
    if english:
        texts["en"] = english
    if spanish:
        texts["es"] = spanish
    return texts or None


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
        language: OverviewLanguage = "en",
    ) -> PokemonOverviewDocument:
        now = datetime.now(timezone.utc)
        doc = self.get(pokemon)
        text = overview.strip()
        if language == "es":
            if doc is None:
                raise ValueError("A Spanish overview needs the English overview first")
            doc.overview_es = text
        else:
            if doc is None:
                doc = PokemonOverviewDocument(pokemon=pokemon, generated_at=now)
            doc.name = name.strip()
            doc.overview = text
        doc.source = source
        doc.model = model
        doc.updated_at = now
        if not doc.generated_at:
            doc.generated_at = now
        doc.save()
        return doc

    def get(self, pokemon: ObjectId) -> PokemonOverviewDocument | None:
        return PokemonOverviewDocument.objects(pokemon=pokemon).first()

    def overview_map(self) -> dict[int, dict[str, str]]:
        """Base-form overviews keyed by Pokédex number, for the National Dex compile."""
        pokedex_by_id = self._pokemon.base_pokedex_ids()
        mapped: dict[int, dict[str, str]] = {}
        for doc in PokemonOverviewDocument.objects.only("pokemon", "overview", "overview_es"):
            pokedex_id = pokedex_by_id.get(doc.pokemon)
            texts = overview_texts(doc)
            if pokedex_id and texts:
                mapped[pokedex_id] = texts
        return mapped

    def has_language(self, pokemon: ObjectId, language: OverviewLanguage = "en") -> bool:
        doc = self.get(pokemon)
        texts = overview_texts(doc)
        if not texts:
            return False
        return language in texts

    def exists_for(self, pokemon: ObjectId) -> bool:
        return self.has_language(pokemon, "en")

    def existing_resource_ids(self, resource_ids: list[int], language: OverviewLanguage = "en") -> set[int]:
        found: set[int] = set()
        for resource_id in resource_ids:
            row = self._pokemon.get_by_resource_id(resource_id)
            if row is not None and self.has_language(row.id, language):
                found.add(resource_id)
        return found

    def count(self) -> int:
        return int(PokemonOverviewDocument.objects.count())
