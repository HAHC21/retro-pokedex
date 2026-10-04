"""Open misses. One row per kind + subject. A repeat increments hits."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.app.data_gap_document import DataGapDocument

CATALOG_NAMES = "catalog_names"
TYPE_MEMBERSHIP = "type_membership"
REGIONAL_DEX = "regional_dex"
DETAIL = "detail"
SPAWNS = "spawns"
LEARNSET = "learnset"
OBTAIN_INDEX = "obtain_index"
ACQUISITION = "acquisition"
FORM = "form"


class DataGapRepository:
    def record(
        self,
        kind: str,
        subject: str,
        *,
        resource_id: int | None = None,
        game_key: str | None = None,
        form: str | None = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        doc = DataGapDocument.objects(kind=kind, subject=subject).first()
        if doc is None:
            try:
                DataGapDocument(
                    kind=kind,
                    subject=subject,
                    resource_id=resource_id,
                    game_key=game_key,
                    form=form,
                    hits=1,
                    first_seen_at=now,
                    last_seen_at=now,
                    resolved_at=None,
                ).save()
                return
            except NotUniqueError:
                doc = DataGapDocument.objects(kind=kind, subject=subject).first()
                if doc is None:
                    return
        if doc.resolved_at is not None:
            doc.hits = 1
            doc.first_seen_at = now
            doc.resolved_at = None
        else:
            doc.hits = int(doc.hits or 0) + 1
        doc.last_seen_at = now
        doc.resource_id = resource_id
        doc.game_key = game_key
        doc.form = form
        doc.save()

    def open_gaps(self) -> list[dict[str, Any]]:
        docs = DataGapDocument.objects(resolved_at=None).order_by("kind", "subject")
        return [
            {
                "kind": str(doc.kind),
                "subject": str(doc.subject),
                "resource_id": int(doc.resource_id) if doc.resource_id is not None else None,
                "game_key": str(doc.game_key) if doc.game_key else None,
                "form": str(doc.form) if doc.form else None,
                "hits": int(doc.hits or 0),
            }
            for doc in docs
        ]

    def resolve(self, kind: str, subject: str) -> None:
        DataGapDocument.objects(kind=kind, subject=subject, resolved_at=None).update(
            set__resolved_at=datetime.now(timezone.utc)
        )
