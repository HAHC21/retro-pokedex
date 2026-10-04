"""Store rarity on every Pokémon row.

Values are mythical, legendary, pseudo, fossil, and starter. Every form of a
species gets the same value. Other species keep the field empty.

Usage (from backend/):

    python -m scripts.set_rarity
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.catalog.starters import STARTER_IDS
from app.db.app.pokemon_document import PokemonDocument
from app.db.mongo import connect_mongo, disconnect_mongo
from app.repositories.pokeapi_cache import PokeApiCacheRepository

_LIMIT = 1025


def _assignments() -> dict[int, str]:
    legendaries, mythicals, pseudos, fossils = PokeApiCacheRepository().scan_species_rarity(_LIMIT)
    assigned: dict[int, str] = {}
    for pokedex_id in fossils:
        assigned[pokedex_id] = "fossil"
    for pokedex_id in pseudos:
        assigned[pokedex_id] = "pseudo"
    for pokedex_id in legendaries:
        assigned[pokedex_id] = "legendary"
    for pokedex_id in mythicals:
        assigned[pokedex_id] = "mythical"
    for pokedex_id in STARTER_IDS:
        assigned.setdefault(pokedex_id, "starter")
    return assigned


def main() -> None:
    connect_mongo()
    try:
        assigned = _assignments()
        saved = 0
        counts = {"mythical": 0, "legendary": 0, "pseudo": 0, "fossil": 0, "starter": 0, "": 0}
        seen: set[tuple[int, str]] = set()
        for doc in PokemonDocument.objects():
            value = assigned.get(int(doc.pokedex_id))
            doc.rarity = value
            doc.save()
            saved += 1
            key = (int(doc.pokedex_id), value or "")
            if key in seen:
                continue
            seen.add(key)
            counts[value or ""] += 1
        print(
            f"Saved rarity on {saved} rows "
            f"({counts['mythical']} mythical, {counts['legendary']} legendary, "
            f"{counts['pseudo']} pseudo, {counts['fossil']} fossil, {counts['starter']} starter)"
        )
    finally:
        disconnect_mongo()


if __name__ == "__main__":
    main()
