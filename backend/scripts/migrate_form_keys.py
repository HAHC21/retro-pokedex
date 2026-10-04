"""Mark existing compiled rows as the base form and drop indexes that block a second form.

Usage (from backend/):

    python -m scripts.migrate_form_keys
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from mongoengine.connection import get_db

from app.db.app.pokemon_ai_moveset_document import PokemonAiMovesetDocument
from app.db.app.pokemon_detail_view_document import PokemonDetailViewDocument
from app.db.app.pokemon_evolution_document import PokemonEvolutionDocument
from app.db.app.pokemon_spawns_document import PokemonSpawnsDocument
from app.db.app.user_collection_mark_document import UserCollectionMarkDocument
from app.db.mongo import connect_mongo, disconnect_mongo
from app.repositories.pokemon_form import types_from_payload

_COLLECTIONS = (
    "pokemon_detail_view",
    "pokemon_spawns",
    "pokemon_evolution",
    "pokemon_ai_movesets",
    "user_collection_marks",
)

_OLD_INDEXES = {
    "pokemon_detail_view": ("pokemon_id_1",),
    "pokemon_spawns": ("pokemon_id_1",),
    "pokemon_evolution": ("pokemon_id_1",),
    "pokemon_ai_movesets": ("pokemon_id_1_game_1",),
    "user_collection_marks": ("user_id_1_game_1_pokemon_id_1",),
}


def _drop_old_indexes(db) -> None:
    for name, indexes in _OLD_INDEXES.items():
        existing = {item["name"] for item in db[name].list_indexes()}
        for index_name in indexes:
            if index_name not in existing:
                print(f"  {name}: {index_name} already gone")
                continue
            db[name].drop_index(index_name)
            print(f"  dropped {name}.{index_name}")


def _backfill_types(db) -> int:
    cache = db["pokeapi_cache"]
    updated = 0
    for row in db["pokemon"].find({"$or": [{"types": {"$exists": False}}, {"types": []}]}, {"resource_id": 1}):
        resource_id = row.get("resource_id")
        if not resource_id:
            continue
        cached = cache.find_one({"path": f"pokemon/{resource_id}"}, {"body.data.types": 1})
        payload = ((cached or {}).get("body") or {}).get("data") or {}
        types = types_from_payload(payload)
        if not types:
            continue
        db["pokemon"].update_one({"_id": row["_id"]}, {"$set": {"types": types}})
        updated += 1
    return updated


def migrate() -> None:
    connect_mongo()
    try:
        db = get_db()
        for name in _COLLECTIONS:
            result = db[name].update_many({"form": {"$exists": False}}, {"$set": {"form": "base"}})
            print(f"  {name}: set form=base on {result.modified_count}")
        _drop_old_indexes(db)
        typed = _backfill_types(db)
        print(f"  pokemon types filled from cache: {typed}")
        for document in (
            PokemonDetailViewDocument,
            PokemonSpawnsDocument,
            PokemonEvolutionDocument,
            PokemonAiMovesetDocument,
            UserCollectionMarkDocument,
        ):
            document.ensure_indexes()
        print("indexes ready")
    finally:
        disconnect_mongo()


if __name__ == "__main__":
    migrate()
