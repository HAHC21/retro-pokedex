import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx

from app.repositories.pokeapi_cache_repository import PokeApiCacheRepository


class PokeApiClient:
    """HTTP adapter for PokéAPI with MongoDB cache-aside (monthly TTL, stale on failure)."""

    def __init__(
        self,
        base_url: str,
        user_agent: str,
        cache: PokeApiCacheRepository,
        ttl_seconds: int = 60 * 60 * 24 * 30,
        timeout_seconds: float = 20.0,
    ) -> None:
        self._http = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout_seconds,
            follow_redirects=True,
            headers={"User-Agent": user_agent, "Accept": "application/json"},
        )
        self._cache = cache
        self._ttl_seconds = ttl_seconds

    async def list_pokemon(self, limit: int, offset: int) -> dict[str, Any]:
        payload = await self._get_json("pokemon", {"limit": limit, "offset": offset})
        if payload is None:
            return {"count": 0, "results": []}
        return payload

    async def list_species(self, limit: int, offset: int) -> dict[str, Any]:
        payload = await self._get_json("pokemon-species", {"limit": limit, "offset": offset})
        if payload is None:
            return {"count": 0, "results": []}
        return payload

    async def get_pokemon(self, pokemon_id: int) -> dict[str, Any] | None:
        return await self._get_json(f"pokemon/{pokemon_id}")

    async def get_generation(self, generation_id: int) -> dict[str, Any] | None:
        return await self._get_json(f"generation/{generation_id}")

    async def get_species(self, name_or_id: str | int) -> dict[str, Any] | None:
        return await self._get_json(f"pokemon-species/{name_or_id}")

    async def get_type(self, name: str) -> dict[str, Any] | None:
        return await self._get_json(f"type/{name}")

    async def get_encounters(self, pokemon_id: int) -> list[Any]:
        payload = await self._get_json(f"pokemon/{pokemon_id}/encounters")
        if payload is None:
            return []
        if isinstance(payload, list):
            return payload
        return []

    async def get_evolution_chain(self, chain_id: int) -> dict[str, Any] | None:
        return await self._get_json(f"evolution-chain/{chain_id}")

    async def get_location_area(self, area_id: int) -> dict[str, Any] | None:
        return await self._get_json(f"location-area/{area_id}")

    async def get_location(self, location_id: int) -> dict[str, Any] | None:
        return await self._get_json(f"location/{location_id}")

    async def get_pokedex(self, name_or_id: str | int) -> dict[str, Any] | None:
        return await self._get_json(f"pokedex/{name_or_id}")

    async def list_moves(self, *, limit: int = 2000, offset: int = 0) -> dict[str, Any]:
        payload = await self._get_json("move", {"limit": limit, "offset": offset})
        if payload is None:
            return {"count": 0, "results": []}
        return payload

    async def get_move(self, name_or_id: str | int) -> dict[str, Any] | None:
        return await self._get_json(f"move/{name_or_id}")

    async def get_ability(self, name_or_id: str | int) -> dict[str, Any] | None:
        return await self._get_json(f"ability/{name_or_id}")

    async def aclose(self) -> None:
        await self._http.aclose()

    def cache_key(self, path: str, params: dict[str, Any] | None = None) -> str:
        return self._cache_key(path, params)

    async def get_cached(self, path: str, params: dict[str, Any] | None = None) -> Any:
        """Return Mongo payload if present, ignoring TTL. Does not hit PokéAPI."""
        record = await asyncio.to_thread(self._cache.get, self._cache_key(path, params))
        return None if record is None else record.payload

    async def get_cached_many(self, paths: list[str]) -> dict[str, Any]:
        """Bulk Mongo read by cache path; missing paths are omitted. No PokéAPI calls."""
        if not paths:
            return {}
        return await asyncio.to_thread(self._cache.get_many, paths)

    async def cache_if_absent(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        force: bool = False,
    ) -> str:
        """Write PokéAPI JSON into Mongo when the path is missing.

        Ignores TTL: existing rows are left alone unless ``force`` is set.
        Returns ``skip``, ``fetched``, or ``missing`` (HTTP 404, still cached).
        """
        cache_key = self._cache_key(path, params)
        if not force:
            record = await asyncio.to_thread(self._cache.get, cache_key)
            if record is not None:
                return "skip"
        payload = await self._fetch_into_cache(path, params)
        return "missing" if payload is None else "fetched"

    async def _get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        cache_key = self._cache_key(path, params)
        record = await asyncio.to_thread(self._cache.get, cache_key)
        if record is not None and self._is_fresh(record.fetched_at):
            return record.payload

        try:
            return await self._fetch_into_cache(path, params)
        except Exception:
            if record is not None:
                return record.payload
            raise

    async def _fetch_into_cache(self, path: str, params: dict[str, Any] | None = None) -> Any:
        cache_key = self._cache_key(path, params)
        response = await self._http.get(path, params=params)
        if response.status_code == 404:
            await asyncio.to_thread(self._cache.upsert, cache_key, None)
            return None
        response.raise_for_status()
        payload = response.json()
        etag = response.headers.get("ETag")
        await asyncio.to_thread(self._cache.upsert, cache_key, payload, etag=etag)
        return payload

    def _is_fresh(self, fetched_at: datetime) -> bool:
        when = fetched_at if fetched_at.tzinfo else fetched_at.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - when).total_seconds()
        return age < self._ttl_seconds

    @staticmethod
    def _cache_key(path: str, params: dict[str, Any] | None) -> str:
        if not params:
            return path
        query = "&".join(f"{key}={params[key]}" for key in sorted(params))
        return f"{path}?{query}"
