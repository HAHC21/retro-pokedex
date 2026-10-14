from typing import Any

from scripts.learnset.version_groups import METHOD_LABELS
from app.db.app.move_document import MoveDocument


def id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1] or "0")


def title(value: str) -> str:
    if not value:
        return ""
    return "-".join(part[:1].upper() + part[1:] for part in value.split("-") if part)


def method_label(method: str) -> str:
    meta = METHOD_LABELS.get(method)
    return meta[0] if meta else title(method)


def method_order(method: str) -> int:
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
