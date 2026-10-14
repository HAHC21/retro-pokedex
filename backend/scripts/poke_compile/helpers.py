import re
from typing import Any
from app.catalog.pokemon_form import form_key
from app.db.app.pokemon_document import PokemonDocument

from scripts.poke_compile.const import (
    NOT_WILD,
    POKECENTER,
    _NAMED_REQUIREMENT_KEYS,
    ORDINARY_WILD,
    ROD_LABELS,
    FIELD_LABELS,
    SPECIAL_ORDER,
    REGION_PREFIX,
)


def _title(value: str) -> str:
    if not value:
        return ""
    return "-".join(part[:1].upper() + part[1:] for part in value.split("-") if part)

def _pretty(value: str) -> str:
    if not value:
        return ""
    return " ".join(part[:1].upper() + part[1:] for part in value.split("-") if part)

def _id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1] or "0")

def _form_and_species(
    record: PokemonDocument | None,
    resource_id: int,
    payload: dict[str, Any],
) -> tuple[str, int]:
    data = payload.get("data") or {}
    species = payload.get("species") or {}
    species_url = (data.get("species") or {}).get("url") or ""
    species_id = _id_from_url(species_url) or resource_id
    if record is not None:
        return record.form, int(record.pokedex_id)
    if resource_id == species_id:
        return "base", species_id
    key = form_key(str(data.get("name") or ""), str(species.get("name") or ""))
    return key or "base", species_id

def _named(value: Any) -> str:
    if not isinstance(value, dict):
        return ""
    return str(value.get("name") or "")

def _detail_requirement_count(detail: dict[str, Any]) -> int:
    count = sum(1 for key in _NAMED_REQUIREMENT_KEYS if _named(detail.get(key)))
    for key in ("min_level", "min_happiness", "min_beauty", "min_affection", "needs_overworld_rain", "turn_upside_down"):
        if detail.get(key):
            count += 1
    if detail.get("gender"):
        count += 1
    if detail.get("relative_physical_stats") is not None:
        count += 1
    if detail.get("time_of_day"):
        count += 1
    return count

def _pick_evolution_detail(details: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Prefer the method that states every requirement, such as friendship plus a move type."""
    if not details:
        return None
    return max(details, key=_detail_requirement_count)

def _join_level_phrase(lead: str, qualifiers: list[str]) -> str:
    if not qualifiers:
        return lead
    if len(qualifiers) == 1:
        return f"{lead} {qualifiers[0]}"
    return f"{lead} {', '.join(qualifiers[:-1])} and {qualifiers[-1]}"

def _evolution_qualifiers(detail: dict[str, Any]) -> list[str]:
    qualifiers: list[str] = []
    gender = detail.get("gender")
    if gender == 1:
        qualifiers.append("if female")
    elif gender == 2:
        qualifiers.append("if male")
    if detail.get("min_happiness"):
        qualifiers.append("with high friendship")
    if detail.get("min_affection"):
        qualifiers.append("with high affection")
    if detail.get("min_beauty"):
        qualifiers.append("with high beauty")
    time_of_day = detail.get("time_of_day")
    if time_of_day == "day":
        qualifiers.append("during the day")
    elif time_of_day:
        qualifiers.append("at night")
    if detail.get("needs_overworld_rain"):
        qualifiers.append("in the rain")
    if detail.get("turn_upside_down"):
        qualifiers.append("while the console is upside down")
    location = _named(detail.get("location"))
    if location:
        qualifiers.append(f"at {_pretty(location)}")
    held = _named(detail.get("held_item"))
    if held:
        qualifiers.append(f"while holding {_pretty(held)}")
    known_move = _named(detail.get("known_move"))
    if known_move:
        qualifiers.append(f"while knowing {_title(known_move)}")
    known_move_type = _named(detail.get("known_move_type"))
    if known_move_type:
        qualifiers.append(f"while knowing a {_pretty(known_move_type)}-type move")
    party_species = _named(detail.get("party_species"))
    if party_species:
        qualifiers.append(f"with {_pretty(party_species)} in the party")
    party_type = _named(detail.get("party_type"))
    if party_type:
        qualifiers.append(f"with a {_pretty(party_type)}-type Pokémon in the party")
    stats = detail.get("relative_physical_stats")
    if stats is not None:
        if stats > 0:
            qualifiers.append("when Attack is higher than Defense")
        elif stats < 0:
            qualifiers.append("when Defense is higher than Attack")
        else:
            qualifiers.append("when Attack equals Defense")
    return qualifiers

def _cond_text(detail: dict[str, Any] | None) -> str:
    if not detail:
        return "—"
    trigger_name = _named(detail.get("trigger"))
    item_name = _named(detail.get("item"))
    held_name = _named(detail.get("held_item"))
    if item_name and trigger_name == "use-item":
        return _join_level_phrase(_pretty(item_name), _evolution_qualifiers(detail))
    if trigger_name == "trade":
        if held_name:
            return f"Trade while holding {_pretty(held_name)}"
        partner = _named(detail.get("trade_species"))
        if partner:
            return f"Trade for {_pretty(partner)}"
        return "Trade"

    qualifiers = _evolution_qualifiers(detail)
    if detail.get("min_level"):
        return _join_level_phrase(f"Level {detail['min_level']}", qualifiers)
    if trigger_name == "level-up":
        return _join_level_phrase("Level up", qualifiers)
    if item_name:
        return _join_level_phrase(_pretty(item_name), qualifiers)
    if qualifiers:
        return _join_level_phrase("Level up", qualifiers)
    if trigger_name:
        return _title(trigger_name)
    return "—"

def _place_label(area_name: str) -> str:
    name = re.sub(r"-area$", "", area_name or "", flags=re.I)
    name = REGION_PREFIX.sub("", name)
    safari = re.match(r"^friend-safari(?:-(.+))?$", name, re.I)
    if safari:
        kind = safari.group(1)
        return f"Friend Safari ({_pretty(kind)})" if kind else "Friend Safari"
    route = re.match(r"^route-(\d+[a-z]?)$", name, re.I)
    if route:
        return f"Route {route.group(1)}"
    return _pretty(name) or "Unknown"

def _encounter_kind(method_name: str) -> str:
    name = method_name or ""
    if re.search(r"trade", name):
        return "trade"
    if re.search(r"starter", name):
        return "starter"
    if re.search(r"gift", name):
        return "gift"
    if re.search(r"only-one", name):
        return "static"
    return "wild"

def _kind_label(kind: str, place: str) -> str:
    if kind == "wild":
        return f"Wild Encounter at {place}"
    if kind == "starter":
        return f"Starter at {place}"
    if kind == "gift":
        return f"Gift at {place}"
    if kind == "static":
        return f"Static Encounter at {place}"
    if kind == "trade":
        return "In-game trade"
    return place

def _special_phrase(method: str) -> str:
    if method in ROD_LABELS:
        return f"Fishing with {ROD_LABELS[method]}"
    if method == "surf":
        return "Surfing"
    if method == "dive":
        return "Diving"
    if method in FIELD_LABELS:
        return f"Using {FIELD_LABELS[method]}"
    return f"Using {_pretty(method)}"

def _wild_label(samples: list[tuple[str, int, str]]) -> str:
    """Name the tool only when every encounter in this game needs one."""
    ordinary = [item for item in samples if not item[0] or item[0] in ORDINARY_WILD]
    if ordinary:
        place = max(ordinary, key=lambda item: item[1])[2]
        return _kind_label("wild", place)
    best_by_method: dict[str, tuple[int, str]] = {}
    for method, chance, place in samples:
        previous = best_by_method.get(method)
        if not previous or chance > previous[0]:
            best_by_method[method] = (chance, place)
    ordered = sorted(
        best_by_method,
        key=lambda method: (
            SPECIAL_ORDER.index(method) if method in SPECIAL_ORDER else len(SPECIAL_ORDER),
            method,
        ),
    )
    parts: list[str] = []
    for method in ordered:
        _, place = best_by_method[method]
        where = "" if not place or place == "Unknown" else f" at {place}"
        parts.append(f"{_special_phrase(method)}{where}")
    return " / ".join(parts)

def _evolve_label(parent: str, detail: dict[str, Any] | None) -> str:
    if not detail:
        return f"Evolve {parent}"
    trigger = _named(detail.get("trigger"))
    item = _named(detail.get("item"))
    if trigger == "trade":
        cond = _cond_text(detail)
        rest = cond.removeprefix("Trade").strip()
        return f"Trade {parent} {rest}".strip() if rest else f"Trade {parent}"
    if trigger == "use-item" and item:
        return f"Evolve {parent} using {_cond_text(detail)}"
    cond = _cond_text(detail)
    if cond.startswith("Level up"):
        rest = cond.removeprefix("Level up").strip()
        return f"Level up {parent} {rest}".strip() if rest else f"Level up {parent}"
    if cond.startswith("Level "):
        return f"Evolve {parent} at {cond}"
    if cond and cond != "—":
        return f"Evolve {parent} ({cond})"
    return f"Evolve {parent}"

def obtain_versions_from_raw(raw: list[dict[str, Any]]) -> list[str]:
    versions: set[str] = set()
    for entry in raw:
        area = (entry.get("location_area") or {}).get("name") or ""
        if POKECENTER.search(area):
            continue
        for detail in entry.get("version_details") or []:
            if detail.get("encounter_details"):
                name = (detail.get("version") or {}).get("name")
                if name:
                    versions.add(name)
    return sorted(versions)

def filter_wild_encounters(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    for entry in raw:
        area_name = (entry.get("location_area") or {}).get("name") or ""
        if POKECENTER.search(area_name):
            continue
        versions: list[dict[str, Any]] = []
        for detail in entry.get("version_details") or []:
            details = [
                item
                for item in (detail.get("encounter_details") or [])
                if not NOT_WILD.search((item.get("method") or {}).get("name") or "")
            ]
            if details:
                versions.append({**detail, "encounter_details": details})
        if versions:
            filtered.append({**entry, "version_details": versions})
    return filtered

def unique_regional_pokedex_names() -> list[str]:
    """Deduped PokéAPI pokedex slugs from the game seed (stable order)."""
    from scripts.poke_compile.dex_lists import GAMES

    names: list[str] = []
    seen: set[str] = set()
    for game in GAMES:
        for name in game["pokedexes"]:
            if name in seen:
                continue
            seen.add(name)
            names.append(name)
    return names

def _english_ability_effect(payload: dict[str, Any] | None) -> str | None:
    if not payload:
        return None
    for entry in payload.get("effect_entries") or []:
        if (entry.get("language") or {}).get("name") != "en":
            continue
        text = str(entry.get("short_effect") or entry.get("effect") or "").strip()
        if text:
            return " ".join(text.split())
    flavors = [
        entry
        for entry in payload.get("flavor_text_entries") or []
        if (entry.get("language") or {}).get("name") == "en" and entry.get("flavor_text")
    ]
    if not flavors:
        return None
    return " ".join(str(flavors[-1]["flavor_text"]).split()) or None

def _evolution_detail_for(chain: dict[str, Any], pokemon_id: int) -> dict[str, Any] | None:
    def walk(node: dict[str, Any]) -> dict[str, Any] | None:
        for nxt in node.get("evolves_to") or []:
            species_node = nxt.get("species") or {}
            if _id_from_url(species_node.get("url") or "") == pokemon_id:
                return _pick_evolution_detail(nxt.get("evolution_details") or [])
            found = walk(nxt)
            if found is not None:
                return found
        return None

    return walk(chain.get("chain") or {})

def _evolution_steps_from_chain(chain: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not chain:
        return []
    steps: list[dict[str, Any]] = []

    def walk(node: dict[str, Any], cond: str) -> None:
        species_node = node.get("species") or {}
        steps.append(
            {
                "id": _id_from_url(species_node.get("url") or ""),
                "name": _title(species_node.get("name") or ""),
                "cond": cond,
            }
        )
        for nxt in node.get("evolves_to") or []:
            walk(nxt, _cond_text(_pick_evolution_detail(nxt.get("evolution_details") or [])))

    walk(chain.get("chain") or {}, "Base")
    return steps

def _annotate_encounters(
    encounters: list[dict[str, Any]],
    location_map: dict[str, dict[str, str | None]],
) -> list[dict[str, Any]]:
    annotated: list[dict[str, Any]] = []
    for entry in encounters:
        area_name = (entry.get("location_area") or {}).get("name") or ""
        meta = location_map.get(area_name) or {}
        annotated.append(
            {
                **entry,
                "region": meta.get("region"),
                "loc": meta.get("loc_name"),
            }
        )
    return annotated

def _form_refs(data: dict[str, Any]) -> list[dict[str, str]]:
    refs: list[dict[str, str]] = []
    for entry in data.get("forms") or []:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or "").strip()
        if not name:
            continue
        refs.append({"name": name, "url": str(entry.get("url") or "")})
    return refs

def _project_pokemon_data(data: dict[str, Any], abilities: list[dict[str, Any]]) -> dict[str, Any]:
    """SPA-facing pokemon slice — omit moves and other unused PokéAPI fields."""
    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "height": data.get("height"),
        "weight": data.get("weight"),
        "types": data.get("types") or [],
        "abilities": abilities,
        "stats": data.get("stats") or [],
        "game_indices": data.get("game_indices") or [],
        "species": data.get("species") or {},
        "forms": _form_refs(data),
    }

def _project_species(species: dict[str, Any]) -> dict[str, Any]:
    """Keep fields the detail UI reads; English and Spanish flavor text."""
    flavors = [
        entry
        for entry in (species.get("flavor_text_entries") or [])
        if isinstance(entry, dict) and (entry.get("language") or {}).get("name") in {"en", "es"}
    ]
    return {
        "name": species.get("name"),
        "names": species.get("names") or [],
        "varieties": species.get("varieties") or [],
        "evolution_chain": species.get("evolution_chain"),
        "flavor_text_entries": flavors,
    }

def _abilities_with_effect_map(
    abilities: list[dict[str, Any]],
    effects: dict[str, str | None],
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for entry in abilities:
        name = ((entry.get("ability") or {}).get("name") or "") if isinstance(entry, dict) else ""
        enriched.append({**entry, "description": effects.get(name) if name else None})
    return enriched
