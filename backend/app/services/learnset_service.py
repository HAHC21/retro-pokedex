from __future__ import annotations

from typing import Any

from app.catalog.version_groups import METHOD_LABELS, VERSION_GROUP_IDS, version_groups_for_game
from app.db.documents import MoveDocument


def _id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1] or "0")


def _title(value: str) -> str:
    if not value:
        return ""
    return "-".join(part[:1].upper() + part[1:] for part in value.split("-") if part)


def _method_label(method: str) -> str:
    meta = METHOD_LABELS.get(method)
    return meta[0] if meta else _title(method)


def _method_order(method: str) -> int:
    meta = METHOD_LABELS.get(method)
    return meta[1] if meta else 50


def resolve_move_stats(doc: MoveDocument, version_group_ids: list[int]) -> dict[str, Any]:
    """Pick type/power/accuracy/pp for the earliest selected version group."""
    selected = min(version_group_ids) if version_group_ids else 10_000
    move_type = doc.type
    power = doc.power
    accuracy = doc.accuracy
    pp = doc.pp
    # Treat past version_group as the first VG where newer values apply.
    for past in sorted(doc.past_values or [], key=lambda item: item.version_group_id):
        if selected < past.version_group_id:
            if past.type:
                move_type = past.type
            if past.power is not None:
                power = past.power
            if past.accuracy is not None:
                accuracy = past.accuracy
            if past.pp is not None:
                pp = past.pp
            break
    return {
        "type": move_type,
        "power": power,
        "accuracy": accuracy,
        "pp": pp,
        "damage_class": doc.damage_class,
        "priority": doc.priority,
        "name": doc.display_name,
    }


def build_learnset(
    pokemon_payload: dict[str, Any],
    game_key: str,
    moves_by_id: dict[int, MoveDocument],
) -> list[dict[str, Any]]:
    allowed = version_groups_for_game(game_key)
    allowed_set = None if allowed is None else set(allowed)
    selected_ids = (
        [VERSION_GROUP_IDS[name] for name in allowed if name in VERSION_GROUP_IDS]
        if allowed is not None
        else [10_000]
    )
    if not selected_ids:
        selected_ids = [10_000]

    best: dict[str, dict[str, Any]] = {}
    for entry in pokemon_payload.get("moves") or []:
        move_ref = entry.get("move") or {}
        move_id = _id_from_url(move_ref.get("url") or "")
        move_slug = move_ref.get("name") or ""
        if not move_id:
            continue
        for detail in entry.get("version_group_details") or []:
            group_name = (detail.get("version_group") or {}).get("name") or ""
            if allowed_set is not None and group_name not in allowed_set:
                continue
            method = (detail.get("move_learn_method") or {}).get("name") or "other"
            level = int(detail.get("level_learned_at") or 0)
            order = int(detail.get("order") or 0)
            key = f"{method}:{move_id}"
            prev = best.get(key)
            if prev and not (level < prev["level"] or (level == prev["level"] and order < prev["order"])):
                continue
            doc = moves_by_id.get(move_id)
            stats = (
                resolve_move_stats(doc, selected_ids)
                if doc is not None
                else {
                    "type": None,
                    "power": None,
                    "accuracy": None,
                    "pp": None,
                    "damage_class": None,
                    "priority": 0,
                    "name": _title(move_slug),
                }
            )
            best[key] = {
                "id": move_id,
                "name": stats["name"],
                "method": method,
                "level": level,
                "order": order,
                "type": stats["type"],
                "damage_class": stats["damage_class"],
                "power": stats["power"],
                "accuracy": stats["accuracy"],
                "pp": stats["pp"],
                "priority": stats["priority"],
            }

    by_method: dict[str, list[dict[str, Any]]] = {}
    for row in best.values():
        by_method.setdefault(row["method"], []).append(row)

    groups: list[dict[str, Any]] = []
    for method, rows in sorted(by_method.items(), key=lambda item: (_method_order(item[0]), item[0])):
        rows.sort(
            key=lambda item: (
                item["level"] if method == "level-up" else 0,
                item["order"] if method == "level-up" else 0,
                item["name"],
            )
        )
        groups.append(
            {
                "method": method,
                "label": _method_label(method),
                "moves": [
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "level": row["level"],
                        "type": row["type"],
                        "damage_class": row["damage_class"],
                        "power": row["power"],
                        "accuracy": row["accuracy"],
                        "pp": row["pp"],
                        "priority": row["priority"],
                    }
                    for row in rows
                ],
            }
        )
    return groups
