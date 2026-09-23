from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.documents import PokeApiCacheEntry

_IN_CHUNK = 500


@dataclass(frozen=True)
class CacheRecord:
    path: str
    payload: Any
    fetched_at: datetime
    etag: str | None = None


class PokeApiCacheRepository:
    """Persistence for PokéAPI cache-aside entries (sync; call via to_thread)."""

    def get(self, path: str) -> CacheRecord | None:
        entry = PokeApiCacheEntry.objects(path=path).first()
        if entry is None:
            return None
        return CacheRecord(
            path=entry.path,
            payload=entry.body.get("data"),
            fetched_at=entry.fetched_at,
            etag=entry.etag,
        )

    def get_many(self, paths: Sequence[str]) -> dict[str, Any]:
        """Return path → payload for every cached row in ``paths`` (missing keys omitted)."""
        payloads: dict[str, Any] = {}
        unique = list(dict.fromkeys(paths))
        for index in range(0, len(unique), _IN_CHUNK):
            chunk = unique[index : index + _IN_CHUNK]
            for entry in PokeApiCacheEntry.objects(path__in=chunk).only("path", "body"):
                payloads[str(entry.path)] = entry.body.get("data")
        return payloads

    def existing_paths(self, paths: Sequence[str]) -> set[str]:
        found: set[str] = set()
        unique = list(dict.fromkeys(paths))
        for index in range(0, len(unique), _IN_CHUNK):
            chunk = unique[index : index + _IN_CHUNK]
            found.update(
                str(entry.path) for entry in PokeApiCacheEntry.objects(path__in=chunk).only("path")
            )
        return found

    def upsert(self, path: str, payload: Any, *, etag: str | None = None) -> CacheRecord:
        now = datetime.now(timezone.utc)
        try:
            entry = PokeApiCacheEntry.objects(path=path).modify(
                upsert=True,
                new=True,
                set__body={"data": payload},
                set__fetched_at=now,
                set__etag=etag,
                set_on_insert__path=path,
            )
        except NotUniqueError:
            entry = PokeApiCacheEntry.objects(path=path).modify(
                new=True,
                set__body={"data": payload},
                set__fetched_at=now,
                set__etag=etag,
            )
        if entry is None:
            entry = PokeApiCacheEntry.objects(path=path).first()
        if entry is None:
            raise RuntimeError(f"Failed to upsert cache entry for {path}")
        return CacheRecord(path=path, payload=payload, fetched_at=now, etag=etag)
