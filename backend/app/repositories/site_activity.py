"""Counts of new accounts, marks, PK uploads, and screenshot scans."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from mongoengine import Document

from app.db.app.user_collection_mark_document import UserCollectionMarkDocument
from app.db.app.user_pokemon_import_document import UserPokemonImportDocument
from app.db.user.box_scan_document import BoxScanDocument
from app.db.user.user_document import UserDocument

DAILY_WINDOW = 14


@dataclass(frozen=True)
class WindowCounts:
    today: int
    last_7_days: int
    last_30_days: int


@dataclass(frozen=True)
class ActivityDay:
    date: str
    users: int
    markings: int
    pk_uploads: int
    screenshots: int


@dataclass(frozen=True)
class ActivitySnapshot:
    users: WindowCounts
    markings: WindowCounts
    pk_uploads: WindowCounts
    screenshots: WindowCounts
    daily: list[ActivityDay]


class SiteActivityRepository:
    def snapshot(self, now: datetime) -> ActivitySnapshot:
        start = _start_of_day(now) - timedelta(days=DAILY_WINDOW - 1)
        users_by_day = _count_by_day(UserDocument, "created_at", start)
        marks_by_day = _count_by_day(UserCollectionMarkDocument, "updated_at", start)
        uploads_by_day = _count_by_day(
            UserPokemonImportDocument,
            "uploaded_at",
            start,
            extra={"source_type": "pk"},
        )
        scans_by_day = _count_by_day(BoxScanDocument, "scanned_at", start)
        daily: list[ActivityDay] = []
        for offset in range(DAILY_WINDOW):
            day = start + timedelta(days=offset)
            key = day.strftime("%Y-%m-%d")
            daily.append(
                ActivityDay(
                    date=key,
                    users=users_by_day.get(key, 0),
                    markings=marks_by_day.get(key, 0),
                    pk_uploads=uploads_by_day.get(key, 0),
                    screenshots=scans_by_day.get(key, 0),
                )
            )
        return ActivitySnapshot(
            users=_window(UserDocument, "created_at", now),
            markings=_window(UserCollectionMarkDocument, "updated_at", now),
            pk_uploads=_window(UserPokemonImportDocument, "uploaded_at", now, extra={"source_type": "pk"}),
            screenshots=_window(BoxScanDocument, "scanned_at", now),
            daily=daily,
        )


def _start_of_day(moment: datetime) -> datetime:
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


def _window(
    model: type[Document],
    field: str,
    now: datetime,
    *,
    extra: dict[str, Any] | None = None,
) -> WindowCounts:
    return WindowCounts(
        today=_count_since(model, field, _start_of_day(now), extra),
        last_7_days=_count_since(model, field, now - timedelta(days=7), extra),
        last_30_days=_count_since(model, field, now - timedelta(days=30), extra),
    )


def _count_since(
    model: type[Document],
    field: str,
    since: datetime,
    extra: dict[str, Any] | None,
) -> int:
    filters: dict[str, Any] = {f"{field}__gte": since}
    if extra:
        filters.update(extra)
    return int(model.objects(**filters).count())


def _count_by_day(
    model: type[Document],
    field: str,
    start: datetime,
    *,
    extra: dict[str, Any] | None = None,
) -> dict[str, int]:
    match: dict[str, Any] = {field: {"$gte": start}}
    if extra:
        match.update(extra)
    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": f"${field}",
                        "timezone": "UTC",
                    }
                },
                "count": {"$sum": 1},
            }
        },
    ]
    return {str(row["_id"]): int(row["count"]) for row in model.objects.aggregate(pipeline)}
