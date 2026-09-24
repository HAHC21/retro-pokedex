"""Point existing overviews at a Pokémon row.

Each form shares a Pokédex number and is stored as its own document.
Overviews keep the text they already have and switch their key to that document id.

Usage (from backend/):

    python -m scripts.link_pokemon_forms
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from mongoengine.connection import get_db

from app.catalog.pokemon_form import form_key
from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import get_pokeapi_client, shutdown_external_clients
from app.repositories.pokemon_form_repository import PokemonRepository, _stats_from_payload, types_from_payload


def _id_from_url(url: str) -> int:
    try:
        return int(url.rstrip("/").split("/")[-1])
    except (TypeError, ValueError):
        return 0


async def link() -> None:
    raw = get_db()["pokemon_overviews"]
    pokemon_repo = PokemonRepository()
    pokeapi = get_pokeapi_client()
    linked = 0
    skipped = 0
    try:
        raw.drop_index("pokemon_id_1")
    except Exception:
        pass
    for doc in list(raw.find({})):
        if doc.get("pokemon") and "pokemon_id" not in doc:
            skipped += 1
            continue
        resource_id = int(doc.get("pokemon_id") or 0)
        if resource_id <= 0:
            print(f"  skip overview {doc.get('_id')}: no pokemon_id")
            continue
        payload = await pokeapi.get_pokemon(resource_id)
        if not payload:
            print(f"  missing pokemon/{resource_id}")
            continue
        species_url = ((payload.get("species") or {}).get("url") or "")
        pokedex_id = _id_from_url(species_url) or resource_id
        species = await pokeapi.get_species(pokedex_id)
        species_slug = str((species or {}).get("name") or payload.get("name") or "")
        form = form_key(str(payload.get("name") or ""), species_slug) or "base"
        name = str(doc.get("name") or species_slug or f"#{pokedex_id}")
        row = pokemon_repo.upsert(
            pokedex_id=pokedex_id,
            form=form,
            name=name,
            resource_id=resource_id,
            stats=_stats_from_payload(payload),
            types=types_from_payload(payload),
        )
        raw.update_one(
            {"_id": doc["_id"]},
            {"$set": {"pokemon": row.id, "name": name}, "$unset": {"pokemon_id": ""}},
        )
        linked += 1
        print(f"  #{pokedex_id} {form} ({name.encode('ascii', 'replace').decode()})")
    from app.db.documents import PokemonOverviewDocument

    PokemonOverviewDocument.ensure_indexes()
    try:
        raw.drop_index("pokemon_id_1")
    except Exception:
        pass
    print(f"Linked {linked}, already linked {skipped}, pokemon rows={pokemon_repo and 'ok'}")


def main() -> None:
    connect_mongo()
    try:
        asyncio.run(_run())
    finally:
        disconnect_mongo()


async def _run() -> None:
    try:
        await link()
    finally:
        await shutdown_external_clients()


if __name__ == "__main__":
    main()
