"""Set ``capture`` on every Pokémon row and insert missing Gigantamax forms.

Mega Evolutions and Gigantamax cannot be caught directly. Base species and
regional forms can. Gigantamax varieties are read from the cached species
documents and stored when the table does not already have that row.

Usage (from backend/):

    python -m scripts.set_capture
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.catalog.pokemon_form import can_capture, form_key
from app.db.documents import PokeApiCacheEntry, PokemonDocument
from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import get_pokeapi_client, shutdown_external_clients
from app.repositories.pokemon_form_repository import PokemonRepository, _stats_from_payload, types_from_payload


def _trailing_id(url: str) -> int:
    try:
        return int(url.rstrip("/").split("/")[-1])
    except (TypeError, ValueError):
        return 0


def _english_name(names: Any, fallback: str) -> str:
    if isinstance(names, list):
        for entry in names:
            if isinstance(entry, dict) and (entry.get("language") or {}).get("name") == "en":
                name = str(entry.get("name") or "").strip()
                if name:
                    return name
    return fallback.replace("-", " ").title()


def _set_existing_capture() -> tuple[int, int]:
    updated = 0
    capturable = 0
    for doc in PokemonDocument.objects():
        value = can_capture(str(doc.form or ""))
        doc.capture = value
        doc.save()
        updated += 1
        if value:
            capturable += 1
    return updated, capturable


def _cached_gigantamax() -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    cursor = PokeApiCacheEntry.objects(path__startswith="pokemon-species/").only("path", "body")
    for doc in cursor:
        data = (doc.body or {}).get("data") or {}
        if not isinstance(data, dict):
            continue
        species_slug = str(data.get("name") or "")
        tail = str(doc.path).rsplit("/", 1)[-1]
        pokedex_id = int(tail) if tail.isdigit() else 0
        if pokedex_id <= 0:
            continue
        species_name = _english_name(data.get("names"), species_slug)
        for variety in data.get("varieties") or []:
            if not isinstance(variety, dict):
                continue
            pokemon = variety.get("pokemon") or {}
            slug = str(pokemon.get("name") or "")
            if form_key(slug, species_slug) != "gigantamax":
                continue
            resource_id = _trailing_id(str(pokemon.get("url") or ""))
            if resource_id <= 0:
                continue
            found.append(
                {
                    "pokedex_id": pokedex_id,
                    "species_name": species_name,
                    "resource_id": resource_id,
                }
            )
    found.sort(key=lambda row: row["pokedex_id"])
    return found


async def _insert_missing_gigantamax() -> int:
    repo = PokemonRepository()
    pokeapi = get_pokeapi_client()
    inserted = 0
    try:
        for row in _cached_gigantamax():
            if repo.get(row["pokedex_id"], "gigantamax") is not None:
                continue
            payload = await pokeapi.get_pokemon(row["resource_id"])
            repo.upsert(
                pokedex_id=row["pokedex_id"],
                form="gigantamax",
                name=f"Gigantamax {row['species_name']}",
                resource_id=row["resource_id"],
                stats=_stats_from_payload(payload),
                types=types_from_payload(payload),
            )
            inserted += 1
            print(f"  #{row['pokedex_id']} gigantamax ({row['species_name']})")
    finally:
        await shutdown_external_clients()
    return inserted


def main() -> None:
    connect_mongo()
    try:
        updated, capturable = _set_existing_capture()
        print(f"Updated capture on {updated} rows ({capturable} capturable)")
        inserted = asyncio.run(_insert_missing_gigantamax())
        print(f"Inserted {inserted} Gigantamax rows")
        updated_after, _ = _set_existing_capture()
        print(f"Capture pass after insert updated {updated_after} rows")
    finally:
        disconnect_mongo()


if __name__ == "__main__":
    main()
