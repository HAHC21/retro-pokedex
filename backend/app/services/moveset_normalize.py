"""Normalize Smogon / AI movesets for the Moves tab."""

from __future__ import annotations

from typing import Any


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _slot_label(value: Any) -> str:
    """Turn a move/item/nature field (string or slash list) into display text."""
    if value is None:
        return ""
    if isinstance(value, list):
        parts = [str(item).strip() for item in value if str(item).strip()]
        return " / ".join(parts)
    return str(value).strip()


def _first_option(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return str(value[0]).strip() if value else ""
    return str(value).strip()


def _smogon_summary(name: str, moves: list[str]) -> str:
    """Short plain-language blurb for what a Smogon set is aiming to do."""
    label = name.strip() or "Balanced"
    if not moves:
        return f"A {label} moveset."
    if len(moves) == 1:
        move_bit = moves[0]
    elif len(moves) == 2:
        move_bit = f"{moves[0]} and {moves[1]}"
    else:
        move_bit = f"{', '.join(moves[:-1])}, and {moves[-1]}"
    return f"{label} set built around {move_bit}."


def normalize_smogon_set(name: str, raw: dict[str, Any], *, format_id: str) -> dict[str, Any]:
    moves_raw = _as_list(raw.get("moves"))
    moves = [_slot_label(slot) for slot in moves_raw if _slot_label(slot)][:4]
    return {
        "name": name,
        "format": format_id,
        "moves": moves,
        "notes": _smogon_summary(name, moves),
        "source": "smogon",
    }


def find_species_sets(payload: dict[str, Any], species_name: str) -> tuple[str, dict[str, Any]] | None:
    """Locate species sets in a format file or generation dump.

    Format files (e.g. gen5ou.json): ``{ Species: { SetName: set } }``
    Gen dumps (e.g. gen5.json): ``{ Species: { tier: { SetName: set } } }``
    """
    entry = payload.get(species_name)
    if isinstance(entry, dict) and entry:
        if _is_sets_map(entry):
            return "", entry
        if _is_tiered_species_entry(entry):
            tier, sets = _pick_tier_sets(entry)
            if sets:
                return tier, sets

    # Older / alternate layout: { tier: { Species: { SetName: set } } }
    for tier, species_map in payload.items():
        if not isinstance(species_map, dict):
            continue
        nested = species_map.get(species_name)
        if isinstance(nested, dict) and _is_sets_map(nested):
            return str(tier), nested
    return None


_TIER_PRIORITY = (
    "ou",
    "uu",
    "uubl",
    "ru",
    "rubl",
    "nu",
    "nubl",
    "pu",
    "publ",
    "zu",
    "nfe",
    "lc",
    "ubers",
    "uber",
    "doublesou",
    "vgc",
)


def _is_sets_map(value: dict[str, Any]) -> bool:
    sample = next(iter(value.values()), None)
    return isinstance(sample, dict) and ("moves" in sample or "item" in sample)


def _is_tiered_species_entry(value: dict[str, Any]) -> bool:
    sample = next(iter(value.values()), None)
    return isinstance(sample, dict) and bool(sample) and _is_sets_map(sample)


def _pick_tier_sets(tier_map: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    for tier in _TIER_PRIORITY:
        sets = tier_map.get(tier)
        if isinstance(sets, dict) and _is_sets_map(sets):
            return tier, sets
    for tier, sets in tier_map.items():
        if isinstance(sets, dict) and _is_sets_map(sets):
            return str(tier), sets
    return "", {}


def species_name_candidates(pokemon_slug: str, species_slug: str = "") -> list[str]:
    """Build Smogon lookup keys: base species first, then form-specific names."""
    from app.catalog.smogon import to_smogon_species_name

    names: list[str] = []

    def add_slug(raw: str) -> None:
        label = to_smogon_species_name(raw)
        if label and label not in names:
            names.append(label)

    if species_slug:
        add_slug(species_slug)
    if pokemon_slug:
        add_slug(pokemon_slug)
        base = _strip_default_form_suffix(pokemon_slug)
        if base:
            add_slug(base)
    return names


_DEFAULT_FORM_SUFFIXES = (
    "altered",
    "average",
    "normal",
    "standard",
    "plant",
    "land",
    "red-striped",
    "midday",
    "solo",
    "full-belly",
    "shield",
    "family-of-four",
    "two-segment",
)


def _strip_default_form_suffix(pokemon_slug: str) -> str:
    slug = (pokemon_slug or "").strip().lower()
    for suffix in _DEFAULT_FORM_SUFFIXES:
        token = f"-{suffix}"
        if slug.endswith(token):
            return slug[: -len(token)]
    return ""


def filter_ai_set(raw: dict[str, Any], *, allowed_moves: set[str]) -> dict[str, Any] | None:
    """Keep only sets whose moves are all in the learnset allowlist (case-insensitive)."""
    allowed_lookup = {move.casefold(): move for move in allowed_moves}
    moves_in = raw.get("moves") or []
    if not isinstance(moves_in, list):
        return None
    resolved: list[str] = []
    for move in moves_in:
        label = str(move).strip()
        match = allowed_lookup.get(label.casefold())
        if not match:
            return None
        resolved.append(match)
    if len(resolved) != 4:
        return None
    summary = (
        str(raw.get("summary") or raw.get("notes") or raw.get("role") or "").strip() or None
    )
    return {
        "name": str(raw.get("name") or "Suggested set").strip() or "Suggested set",
        "moves": resolved,
        "notes": summary,
        "source": "ai",
    }
