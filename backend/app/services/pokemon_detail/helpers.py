from typing import Any

from app.db.app.pokemon_document import PokemonDocument


def apply_stored_stats(payload: dict[str, Any], record: PokemonDocument) -> dict[str, Any]:
    """Overlay the form row's base stats onto a stored species page."""
    stats = record.stats
    if stats is None:
        return payload
    stored = {
        "hp": stats.hp,
        "attack": stats.attack,
        "defense": stats.defense,
        "special-attack": stats.special_attack,
        "special-defense": stats.special_defense,
        "speed": stats.speed,
    }
    data = dict(payload.get("data") or {})
    updated = []
    for entry in data.get("stats") or []:
        name = ((entry.get("stat") or {}).get("name") or "") if isinstance(entry, dict) else ""
        if name in stored:
            updated.append({**entry, "base_stat": stored[name]})
        else:
            updated.append(entry)
    if not updated:
        return payload
    data["stats"] = updated
    return {**payload, "data": data}
