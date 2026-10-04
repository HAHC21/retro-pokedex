"""HTTP client for Smogon moveset data on data.pkmn.cc."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from app.repositories.pokeapi_cache import PokeApiCacheRepository


class SmogonSetsClient:
    """Fetches format/generation set dumps with Mongo cache-aside."""

    def __init__(
        self,
        *,
        base_url: str,
        cache: PokeApiCacheRepository,
        ttl_seconds: int,
        user_agent: str,
        timeout_seconds: float = 30.0,
    ) -> None:
        self._base = base_url.rstrip("/")
        self._cache = cache
        self._ttl_seconds = ttl_seconds
        self._http = httpx.AsyncClient(
            timeout=timeout_seconds,
            follow_redirects=True,
            headers={"User-Agent": user_agent, "Accept": "application/json"},
        )

    async def get_format_sets(self, format_id: str) -> dict[str, Any] | None:
        cache_path = f"smogon/sets/{format_id}"
        cached = await self._read_cache(cache_path)
        if cached is not None:
            return cached
        url = f"{self._base}/{format_id}.json"
        try:
            response = await self._http.get(url)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError):
            stale = await self._read_cache(cache_path, ignore_ttl=True)
            return stale if isinstance(stale, dict) else None
        if not isinstance(payload, dict):
            return None
        await self._write_cache(cache_path, payload)
        return payload

    async def aclose(self) -> None:
        await self._http.aclose()

    async def _read_cache(self, path: str, *, ignore_ttl: bool = False) -> Any | None:
        import asyncio

        record = await asyncio.to_thread(self._cache.get, path)
        if record is None:
            return None
        if not ignore_ttl:
            fetched = record.fetched_at
            if fetched.tzinfo is None:
                fetched = fetched.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - fetched).total_seconds()
            if age > self._ttl_seconds:
                return None
        return record.payload

    async def _write_cache(self, path: str, payload: Any) -> None:
        import asyncio

        await asyncio.to_thread(self._cache.upsert, path, payload)
