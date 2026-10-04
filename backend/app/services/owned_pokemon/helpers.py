"""Payload parsing for owned Pokémon."""

from __future__ import annotations

from typing import Any

from app.domain.owned_pokemon import OwnedMove, StatBlock


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
