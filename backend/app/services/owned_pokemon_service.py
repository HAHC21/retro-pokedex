"""Create / update / list concrete owned Pokémon and sync dex marks."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.domain.owned_pokemon import OwnedMove, OwnedPokemon, StatBlock
from app.repositories.owned_pokemon_repository import OwnedPokemonRepository
from app.repositories.user_collection_repository import UserCollectionRepository


def _opt_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None


def _opt_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _clamp_stat(value: Any, low: int, high: int) -> int | None:
    number = _opt_int(value)
    if number is None:
        return None
    return max(low, min(high, number))


def _met_level_from_payload(raw: Any) -> int | None:
    """Unpack Gen 3–5 OT-gender bit, then clamp to a real met level."""
    value = _opt_int(raw)
    if value is None:
        return None
    if value > 100:
        value &= 0x7F
    return _clamp_stat(value, 0, 100)


def _ivs_from_payload(raw: dict[str, Any] | None) -> StatBlock | None:
    if not raw:
        return None
    return StatBlock(
        hp=_clamp_stat(raw.get("hp"), 0, 31),
        attack=_clamp_stat(raw.get("attack"), 0, 31),
        defense=_clamp_stat(raw.get("defense"), 0, 31),
        special_attack=_clamp_stat(raw.get("special_attack"), 0, 31),
        special_defense=_clamp_stat(raw.get("special_defense"), 0, 31),
        speed=_clamp_stat(raw.get("speed"), 0, 31),
    )


def _calc_stats_from_payload(raw: dict[str, Any] | None) -> StatBlock | None:
    if not raw:
        return None
    return StatBlock(
        hp=_clamp_stat(raw.get("hp"), 1, 999),
        attack=_clamp_stat(raw.get("attack"), 1, 999),
        defense=_clamp_stat(raw.get("defense"), 1, 999),
        special_attack=_clamp_stat(raw.get("special_attack"), 1, 999),
        special_defense=_clamp_stat(raw.get("special_defense"), 1, 999),
        speed=_clamp_stat(raw.get("speed"), 1, 999),
    )


def _evs_from_payload(raw: dict[str, Any] | None) -> StatBlock | None:
    if not raw:
        return None
    return StatBlock(
        hp=_clamp_stat(raw.get("hp"), 0, 252),
        attack=_clamp_stat(raw.get("attack"), 0, 252),
        defense=_clamp_stat(raw.get("defense"), 0, 252),
        special_attack=_clamp_stat(raw.get("special_attack"), 0, 252),
        special_defense=_clamp_stat(raw.get("special_defense"), 0, 252),
        speed=_clamp_stat(raw.get("speed"), 0, 252),
    )


def _moves_from_payload(raw: Any) -> list[OwnedMove]:
    if not isinstance(raw, list):
        return []
    moves: list[OwnedMove] = []
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        name = _opt_str(item.get("name"))
        move_id = _opt_int(item.get("move_id"))
        if not name and not move_id:
            continue
        slot = _opt_int(item.get("slot"))
        moves.append(
            OwnedMove(
                slot=index if slot is None else slot,
                move_id=move_id,
                name=name,
                pp=_opt_int(item.get("pp")),
                pp_ups=_opt_int(item.get("pp_ups")),
            )
        )
    return moves


class OwnedPokemonService:
    def __init__(
        self,
        owned: OwnedPokemonRepository | None = None,
        marks: UserCollectionRepository | None = None,
    ) -> None:
        self._owned = owned or OwnedPokemonRepository()
        self._marks = marks or UserCollectionRepository()

    def list_for_species(self, user_id: str, pokemon_id: int, *, game_key: str | None = None) -> list[OwnedPokemon]:
        return self._owned.list_owned(user_id, pokemon_id=pokemon_id, game_key=game_key)

    def create(self, user_id: str, payload: dict[str, Any]) -> OwnedPokemon:
        now = datetime.now(timezone.utc)
        source_type = str(payload.get("source_type") or "manual").strip() or "manual"
        raw_format = _opt_str(payload.get("raw_format"))
        if raw_format:
            raw_format = raw_format.lower()
        import_id = None
        if source_type == "pk":
            filename = (payload.get("filename") or f"specimen.{raw_format or 'pk'}").strip()
            imported = self._owned.create_import(
                user_id=user_id,
                source_type="pk",
                filename=filename,
                game_key=(payload.get("game_key") or "").strip() or None,
                format_hint=raw_format,
            )
            import_id = imported.import_id
            self._owned.mark_import_parsed(import_id, pokemon_count=1, status="parsed")
        owned = self._owned_from_payload(
            user_id,
            payload,
            now=now,
            import_id=import_id,
            source_type=source_type,
            raw_format=raw_format,
        )
        saved = self._owned.upsert_owned(owned)
        if saved.game_key:
            self._sync_mark(user_id, saved.game_key, saved.pokemon_id)
        return saved

    def create_batch(self, user_id: str, payloads: list[dict[str, Any]], *, filename: str | None = None) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        imported = self._owned.create_import(
            user_id=user_id,
            source_type="pk",
            filename=(filename or f"{len(payloads)} pk files").strip(),
            format_hint="batch",
        )
        saved = 0
        errors: list[dict[str, Any]] = []
        keys: set[tuple[str, int]] = set()
        for index, payload in enumerate(payloads):
            try:
                owned = self._owned_from_payload(
                    user_id,
                    payload,
                    now=now,
                    import_id=imported.import_id,
                    source_type="pk",
                    raw_format=_opt_str(payload.get("raw_format")),
                )
                self._owned.upsert_owned(owned)
                saved += 1
                if owned.game_key:
                    keys.add((owned.game_key, owned.pokemon_id))
            except Exception as exc:
                errors.append(
                    {
                        "index": index,
                        "filename": payload.get("filename"),
                        "error": str(exc),
                    }
                )
        self._owned.mark_import_parsed(
            imported.import_id,
            pokemon_count=saved,
            status="parsed" if saved else "failed",
            error_message=None if saved else "No Pokémon could be saved from this batch.",
        )
        for game_key, pokemon_id in keys:
            self._sync_mark(user_id, game_key, pokemon_id)
        return {
            "import_id": imported.import_id,
            "saved": saved,
            "failed": len(errors),
            "errors": errors[:50],
        }

    def _owned_from_payload(
        self,
        user_id: str,
        payload: dict[str, Any],
        *,
        now: datetime,
        import_id: str | None,
        source_type: str,
        raw_format: str | None,
    ) -> OwnedPokemon:
        pokemon_id = int(payload["pokemon_id"])
        if pokemon_id < 1 or pokemon_id > 1025:
            raise ValueError(f"National Dex #{pokemon_id} is out of range.")
        game_key = (payload.get("game_key") or "").strip() or None
        if raw_format:
            raw_format = raw_format.strip().lower() or None
        return OwnedPokemon(
            owned_id=str(uuid4()),
            user_id=user_id,
            pokemon_id=pokemon_id,
            source_type=source_type,
            created_at=now,
            updated_at=now,
            import_id=import_id,
            raw_format=raw_format,
            species_slug=(payload.get("species_slug") or None),
            nickname=(payload.get("nickname") or None),
            level=_clamp_stat(payload.get("level"), 1, 100),
            gender=(payload.get("gender") or None),
            shiny=bool(payload.get("shiny")),
            ability_name=(payload.get("ability_name") or None),
            ability_slot=_opt_int(payload.get("ability_slot")),
            nature=(payload.get("nature") or None),
            held_item=_opt_str(payload.get("held_item")),
            ball=_opt_str(payload.get("ball")),
            fateful_encounter=bool(payload.get("fateful_encounter")),
            ot_name=_opt_str(payload.get("ot_name")),
            game_key=game_key,
            met_game=_opt_str(payload.get("met_game")),
            met_location=_opt_str(payload.get("met_location")),
            met_level=_met_level_from_payload(payload.get("met_level")),
            met_date=_opt_str(payload.get("met_date")),
            egg_location=_opt_str(payload.get("egg_location")),
            moves=_moves_from_payload(payload.get("moves")),
            ivs=_ivs_from_payload(payload.get("ivs")),
            evs=_evs_from_payload(payload.get("evs")),
            stats=_calc_stats_from_payload(payload.get("stats")),
        )

    def update(self, user_id: str, owned_id: str, payload: dict[str, Any]) -> OwnedPokemon | None:
        existing = self._owned.get_owned(owned_id)
        if existing is None or existing.user_id != user_id:
            return None
        now = datetime.now(timezone.utc)
        game_key = payload.get("game_key", existing.game_key)
        if isinstance(game_key, str):
            game_key = game_key.strip() or None
        updated = OwnedPokemon(
            owned_id=existing.owned_id,
            user_id=existing.user_id,
            pokemon_id=existing.pokemon_id,
            source_type=existing.source_type,
            created_at=existing.created_at,
            updated_at=now,
            import_id=existing.import_id,
            raw_format=existing.raw_format,
            raw_checksum=existing.raw_checksum,
            species_slug=payload.get("species_slug", existing.species_slug),
            form_slug=existing.form_slug,
            nickname=payload.get("nickname", existing.nickname),
            level=_clamp_stat(payload.get("level", existing.level), 1, 100)
            if "level" in payload
            else existing.level,
            experience=existing.experience,
            gender=payload.get("gender", existing.gender),
            shiny=bool(payload["shiny"]) if "shiny" in payload else existing.shiny,
            ability_name=payload.get("ability_name", existing.ability_name),
            ability_slot=_opt_int(payload.get("ability_slot"))
            if "ability_slot" in payload
            else existing.ability_slot,
            nature=payload.get("nature", existing.nature),
            held_item=payload.get("held_item", existing.held_item),
            friendship=existing.friendship,
            pokerus=existing.pokerus,
            ball=existing.ball,
            fateful_encounter=existing.fateful_encounter,
            egg_location=existing.egg_location,
            moves=_moves_from_payload(payload.get("moves")) if "moves" in payload else existing.moves,
            ivs=_ivs_from_payload(payload.get("ivs")) if "ivs" in payload else existing.ivs,
            evs=_evs_from_payload(payload.get("evs")) if "evs" in payload else existing.evs,
            stats=_calc_stats_from_payload(payload.get("stats")) if "stats" in payload else existing.stats,
            ot_name=existing.ot_name,
            ot_id=existing.ot_id,
            ot_gender=existing.ot_gender,
            language=existing.language,
            game_key=game_key,
            met_game=existing.met_game,
            met_location=existing.met_location,
            met_level=existing.met_level,
            met_date=existing.met_date,
            is_party=existing.is_party,
            box_index=existing.box_index,
            slot_index=existing.slot_index,
        )
        saved = self._owned.upsert_owned(updated)
        games = {g for g in (existing.game_key, saved.game_key) if g}
        for game in games:
            self._sync_mark(user_id, game, existing.pokemon_id)
        return saved

    def delete(self, user_id: str, owned_id: str) -> bool:
        existing = self._owned.get_owned(owned_id)
        if existing is None or existing.user_id != user_id:
            return False
        ok = self._owned.delete_owned(owned_id, user_id=user_id)
        if ok and existing.game_key:
            self._sync_mark(user_id, existing.game_key, existing.pokemon_id)
        return ok

    def collected_traits(self, user_id: str, pokemon_id: int, *, game_key: str | None = None) -> dict[str, list[str]]:
        owned = self.list_for_species(user_id, pokemon_id, game_key=game_key)
        abilities = sorted(
            {
                (entry.ability_name or "").strip().casefold().replace(" ", "-")
                for entry in owned
                if entry.ability_name
            }
        )
        natures = sorted({(entry.nature or "").strip().casefold() for entry in owned if entry.nature})
        return {"abilities": abilities, "natures": natures}

    def _sync_mark(self, user_id: str, game_key: str, pokemon_id: int) -> None:
        owned = self._owned.list_owned(user_id, game_key=game_key, pokemon_id=pokemon_id)
        has_normal = any(not entry.shiny for entry in owned)
        has_shiny = any(entry.shiny for entry in owned)
        caught_male = any(not entry.shiny and entry.gender == "male" for entry in owned)
        caught_female = any(not entry.shiny and entry.gender == "female" for entry in owned)
        shiny_male = any(entry.shiny and entry.gender == "male" for entry in owned)
        shiny_female = any(entry.shiny and entry.gender == "female" for entry in owned)
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        existing = (self._marks.list_progress(user_id).get(game_key) or {}).get(str(pokemon_id)) or {}
        self._marks.upsert_mark(
            user_id=user_id,
            game=game_key,
            pokemon_id=pokemon_id,
            caught=has_normal,
            caught_at=existing.get("caughtAt") or (now_ms if has_normal else None),
            caught_male=caught_male,
            caught_female=caught_female,
            shiny=has_shiny,
            shiny_at=existing.get("shinyAt") or (now_ms if has_shiny else None),
            shiny_male=shiny_male,
            shiny_female=shiny_female,
        )
