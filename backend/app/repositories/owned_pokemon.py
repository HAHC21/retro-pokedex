"""Persistence helpers for owned Pokémon and upload batches (sav/PK ready)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.db.app.owned_pokemon_document import OwnedPokemonDocument
from app.db.app.owned_pokemon_move import OwnedPokemonMove
from app.db.app.owned_pokemon_stats import OwnedPokemonStats
from app.db.app.user_pokemon_import_document import UserPokemonImportDocument
from app.domain.owned_pokemon import OwnedMove, OwnedPokemon, PokemonImport, StatBlock


def _stats_doc(block: StatBlock | None) -> OwnedPokemonStats | None:
    if block is None:
        return None
    return OwnedPokemonStats(
        hp=block.hp,
        attack=block.attack,
        defense=block.defense,
        special_attack=block.special_attack,
        special_defense=block.special_defense,
        speed=block.speed,
    )


def _stats_domain(doc: OwnedPokemonStats | None) -> StatBlock | None:
    if doc is None:
        return None
    return StatBlock(
        hp=doc.hp,
        attack=doc.attack,
        defense=doc.defense,
        special_attack=doc.special_attack,
        special_defense=doc.special_defense,
        speed=doc.speed,
    )


class OwnedPokemonRepository:
    def create_import(
        self,
        *,
        user_id: str,
        source_type: str,
        filename: str,
        content_type: str | None = None,
        size_bytes: int | None = None,
        storage_key: str | None = None,
        game_key: str | None = None,
        generation: int | None = None,
        format_hint: str | None = None,
    ) -> PokemonImport:
        now = datetime.now(timezone.utc)
        doc = UserPokemonImportDocument(
            import_id=str(uuid4()),
            user_id=user_id,
            source_type=source_type,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
            storage_key=storage_key,
            game_key=game_key,
            generation=generation,
            format_hint=format_hint,
            status="pending",
            pokemon_count=0,
            uploaded_at=now,
        )
        doc.save()
        return self._to_import(doc)

    def get_import(self, import_id: str) -> PokemonImport | None:
        doc = UserPokemonImportDocument.objects(import_id=import_id).first()
        return self._to_import(doc) if doc else None

    def list_imports(self, user_id: str, *, limit: int = 50) -> list[PokemonImport]:
        docs = (
            UserPokemonImportDocument.objects(user_id=user_id)
            .order_by("-uploaded_at")
            .limit(max(1, min(limit, 200)))
        )
        return [self._to_import(doc) for doc in docs]

    def mark_import_parsed(
        self,
        import_id: str,
        *,
        pokemon_count: int,
        status: str = "parsed",
        error_message: str | None = None,
    ) -> PokemonImport | None:
        doc = UserPokemonImportDocument.objects(import_id=import_id).first()
        if doc is None:
            return None
        doc.status = status
        doc.pokemon_count = pokemon_count
        doc.error_message = error_message
        doc.parsed_at = datetime.now(timezone.utc)
        doc.save()
        return self._to_import(doc)

    def upsert_owned(self, pokemon: OwnedPokemon) -> OwnedPokemon:
        now = datetime.now(timezone.utc)
        doc = OwnedPokemonDocument.objects(owned_id=pokemon.owned_id).first()
        if doc is None:
            doc = OwnedPokemonDocument(owned_id=pokemon.owned_id, created_at=pokemon.created_at or now)
        doc.user_id = pokemon.user_id
        doc.import_id = pokemon.import_id
        doc.source_type = pokemon.source_type
        doc.raw_format = pokemon.raw_format
        doc.raw_checksum = pokemon.raw_checksum
        doc.pokemon_id = pokemon.pokemon_id
        doc.species_slug = pokemon.species_slug
        doc.form_slug = pokemon.form_slug
        doc.nickname = pokemon.nickname
        doc.level = pokemon.level
        doc.experience = pokemon.experience
        doc.gender = pokemon.gender
        doc.shiny = pokemon.shiny
        doc.ability_name = pokemon.ability_name
        doc.ability_slot = pokemon.ability_slot
        doc.nature = pokemon.nature
        doc.held_item = pokemon.held_item
        doc.friendship = pokemon.friendship
        doc.pokerus = pokemon.pokerus
        doc.ball = pokemon.ball
        doc.fateful_encounter = pokemon.fateful_encounter
        doc.egg_location = pokemon.egg_location
        doc.moves = [
            OwnedPokemonMove(
                slot=move.slot,
                move_id=move.move_id,
                name=move.name,
                pp=move.pp,
                pp_ups=move.pp_ups,
            )
            for move in pokemon.moves
        ]
        doc.ivs = _stats_doc(pokemon.ivs)
        doc.evs = _stats_doc(pokemon.evs)
        doc.stats = _stats_doc(pokemon.stats)
        doc.ot_name = pokemon.ot_name
        doc.ot_id = pokemon.ot_id
        doc.ot_gender = pokemon.ot_gender
        doc.language = pokemon.language
        doc.game_key = pokemon.game_key
        doc.met_game = pokemon.met_game
        doc.met_location = pokemon.met_location
        doc.met_level = pokemon.met_level
        doc.met_date = pokemon.met_date
        doc.is_party = pokemon.is_party
        doc.box_index = pokemon.box_index
        doc.slot_index = pokemon.slot_index
        doc.updated_at = now
        if not doc.created_at:
            doc.created_at = now
        doc.save()
        return self._to_owned(doc)

    def list_owned(
        self,
        user_id: str,
        *,
        game_key: str | None = None,
        pokemon_id: int | None = None,
        limit: int = 500,
    ) -> list[OwnedPokemon]:
        query: dict[str, Any] = {"user_id": user_id}
        if game_key:
            query["game_key"] = game_key
        if pokemon_id is not None:
            query["pokemon_id"] = pokemon_id
        docs = (
            OwnedPokemonDocument.objects(**query)
            .order_by("-updated_at")
            .limit(max(1, min(limit, 2000)))
        )
        return [self._to_owned(doc) for doc in docs]

    def list_owned_index(self, user_id: str, *, limit: int = 5000) -> list[dict[str, Any]]:
        docs = (
            OwnedPokemonDocument.objects(user_id=user_id)
            .only("pokemon_id", "species_slug", "form_slug", "source_type")
            .limit(max(1, min(limit, 8000)))
        )
        rows: list[dict[str, Any]] = []
        for doc in docs:
            rows.append(
                {
                    "pokemon_id": int(doc.pokemon_id),
                    "species_slug": doc.species_slug,
                    "form_slug": doc.form_slug,
                    "source_type": doc.source_type or "manual",
                }
            )
        return rows

    def list_mark_sources(self, user_id: str) -> list[dict[str, Any]]:
        """Fields a specimen contributes to the catch mark for its save."""
        docs = OwnedPokemonDocument.objects(user_id=user_id).only(
            "pokemon_id", "game_key", "form_slug", "shiny", "gender"
        )
        sources: list[dict[str, Any]] = []
        for doc in docs:
            game_key = (doc.game_key or "").strip()
            if not game_key:
                continue
            form = (doc.form_slug or "base").strip() or "base"
            gender = (doc.gender or "").strip().lower()
            sources.append(
                {
                    "pokemon_id": int(doc.pokemon_id),
                    "game_key": game_key,
                    "form": form,
                    "shiny": bool(doc.shiny),
                    "gender": gender if gender in {"male", "female"} else None,
                }
            )
        return sources

    def get_owned(self, owned_id: str) -> OwnedPokemon | None:
        doc = OwnedPokemonDocument.objects(owned_id=owned_id).first()
        return self._to_owned(doc) if doc else None

    def delete_owned(self, owned_id: str, *, user_id: str | None = None) -> bool:
        query: dict[str, Any] = {"owned_id": owned_id}
        if user_id is not None:
            query["user_id"] = user_id
        return int(OwnedPokemonDocument.objects(**query).delete()) > 0

    def delete_owned_for_import(self, import_id: str) -> int:
        return int(OwnedPokemonDocument.objects(import_id=import_id).delete())

    @staticmethod
    def _to_import(doc: UserPokemonImportDocument) -> PokemonImport:
        return PokemonImport(
            import_id=doc.import_id,
            user_id=doc.user_id,
            source_type=doc.source_type,
            filename=doc.filename,
            status=doc.status,
            uploaded_at=doc.uploaded_at,
            content_type=doc.content_type,
            size_bytes=doc.size_bytes,
            storage_key=doc.storage_key,
            game_key=doc.game_key,
            generation=doc.generation,
            format_hint=doc.format_hint,
            error_message=doc.error_message,
            pokemon_count=int(doc.pokemon_count or 0),
            parsed_at=doc.parsed_at,
        )

    @staticmethod
    def _to_owned(doc: OwnedPokemonDocument) -> OwnedPokemon:
        return OwnedPokemon(
            owned_id=doc.owned_id,
            user_id=doc.user_id,
            pokemon_id=int(doc.pokemon_id),
            source_type=doc.source_type,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            import_id=doc.import_id,
            raw_format=doc.raw_format,
            raw_checksum=doc.raw_checksum,
            species_slug=doc.species_slug,
            form_slug=doc.form_slug,
            nickname=doc.nickname,
            level=doc.level,
            experience=doc.experience,
            gender=doc.gender,
            shiny=bool(doc.shiny),
            ability_name=doc.ability_name,
            ability_slot=doc.ability_slot,
            nature=doc.nature,
            held_item=doc.held_item,
            friendship=doc.friendship,
            pokerus=bool(doc.pokerus),
            ball=doc.ball,
            fateful_encounter=bool(doc.fateful_encounter),
            egg_location=doc.egg_location,
            moves=[
                OwnedMove(
                    slot=int(move.slot),
                    move_id=move.move_id,
                    name=move.name,
                    pp=move.pp,
                    pp_ups=move.pp_ups,
                )
                for move in (doc.moves or [])
            ],
            ivs=_stats_domain(doc.ivs),
            evs=_stats_domain(doc.evs),
            stats=_stats_domain(getattr(doc, "stats", None)),
            ot_name=doc.ot_name,
            ot_id=doc.ot_id,
            ot_gender=doc.ot_gender,
            language=doc.language,
            game_key=doc.game_key,
            met_game=doc.met_game,
            met_location=doc.met_location,
            met_level=doc.met_level,
            met_date=doc.met_date,
            is_party=bool(doc.is_party),
            box_index=doc.box_index,
            slot_index=doc.slot_index,
        )
