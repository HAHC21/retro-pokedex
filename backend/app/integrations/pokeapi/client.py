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

    async def aclose(self) -> None:
        await self._http.aclose()

    async def _get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        cache_key = self._cache_key(path, params)
        record = await asyncio.to_thread(self._cache.get, cache_key)
        if record is not None and self._is_fresh(record.fetched_at):
            return record.payload

        try:
            response = await self._http.get(path, params=params)
            if response.status_code == 404:
                await asyncio.to_thread(self._cache.upsert, cache_key, None)
                return None
            response.raise_for_status()
            payload = response.json()
            etag = response.headers.get("ETag")
            await asyncio.to_thread(self._cache.upsert, cache_key, payload, etag=etag)
            return payload
        except Exception:
            if record is not None:
                return record.payload
            raise

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
