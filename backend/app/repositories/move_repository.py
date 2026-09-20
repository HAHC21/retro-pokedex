from datetime import datetime, timezone
from typing import Any, Iterable

from app.db.documents import MoveDocument, MovePastValue


def _id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1] or "0")


def _english_name(payload: dict[str, Any], fallback: str) -> str:
    for entry in payload.get("names") or []:
        if (entry.get("language") or {}).get("name") == "en" and entry.get("name"):
            return str(entry["name"])
    return fallback.replace("-", " ").title()


class MoveRepository:
    """Persistence for the synced PokéAPI move catalog."""

    def upsert_payload(self, payload: dict[str, Any]) -> MoveDocument:
        move_id = int(payload["id"])
        past = [
            MovePastValue(
                version_group=str((entry.get("version_group") or {}).get("name") or ""),
                version_group_id=_id_from_url(((entry.get("version_group") or {}).get("url") or "")),
                type=((entry.get("type") or {}).get("name") if entry.get("type") else None),
                power=entry.get("power"),
                accuracy=entry.get("accuracy"),
                pp=entry.get("pp"),
            )
            for entry in payload.get("past_values") or []
            if (entry.get("version_group") or {}).get("name")
        ]
        now = datetime.now(timezone.utc)
        doc = MoveDocument.objects(move_id=move_id).first()
        if doc is None:
            doc = MoveDocument(move_id=move_id)
        doc.name = str(payload["name"])
        doc.display_name = _english_name(payload, str(payload["name"]))
        doc.type = (payload.get("type") or {}).get("name") or "unknown"
        doc.damage_class = (payload.get("damage_class") or {}).get("name") or "status"
        doc.power = payload.get("power")
        doc.accuracy = payload.get("accuracy")
        doc.pp = payload.get("pp")
        doc.priority = int(payload.get("priority") or 0)
        doc.past_values = past
        doc.synced_at = now
        doc.save()
        return doc

    def get_by_ids(self, move_ids: Iterable[int]) -> dict[int, MoveDocument]:
        ids = list({int(item) for item in move_ids if int(item)})
        if not ids:
            return {}
        return {doc.move_id: doc for doc in MoveDocument.objects(move_id__in=ids)}

    def count(self) -> int:
        return int(MoveDocument.objects.count())
