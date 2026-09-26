from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.db.documents import PokedexEntryDocument, PokedexSyncMeta


def _id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1] or "0")


class PokedexEntryRepository:
    """Flatten PokéAPI pokedex payloads and assemble regional lists via aggregation."""

    def needs_sync(self, pokedex: str) -> bool:
        meta = PokedexSyncMeta.objects(pokedex=pokedex).first()
        if meta is None:
            return True
        when = meta.synced_at if meta.synced_at.tzinfo else meta.synced_at.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - when).total_seconds()
        return age >= settings.pokeapi_cache_ttl_seconds

    def has_entries(self, pokedex: str) -> bool:
        return PokedexEntryDocument.objects(pokedex=pokedex).only("id").first() is not None

    def sync_from_payload(self, pokedex: str, payload: dict[str, Any] | None) -> int:
        PokedexEntryDocument.objects(pokedex=pokedex).delete()
        docs: list[PokedexEntryDocument] = []
        if payload:
            for entry in payload.get("pokemon_entries") or []:
                species_id = _id_from_url((entry.get("pokemon_species") or {}).get("url") or "")
                if not species_id or species_id > 1025:
                    continue
                docs.append(
                    PokedexEntryDocument(
                        pokedex=pokedex,
                        species_id=species_id,
                        entry_number=int(entry.get("entry_number") or 0),
                    )
                )
        if docs:
            PokedexEntryDocument.objects.insert(docs, load_bulk=False)
        now = datetime.now(timezone.utc)
        meta = PokedexSyncMeta.objects(pokedex=pokedex).modify(
            upsert=True,
            new=True,
            set__synced_at=now,
            set__entry_count=len(docs),
            set_on_insert__pokedex=pokedex,
        )
        if meta is None:
            PokedexSyncMeta(pokedex=pokedex, synced_at=now, entry_count=len(docs)).save()
        return len(docs)

    def pokedexes_for_species(self, species_id: int) -> list[str]:
        rows = PokedexEntryDocument.objects(species_id=species_id).only("pokedex")
        return [row.pokedex for row in rows]

    def aggregate_regional(self, pokedex_names: list[str]) -> list[dict[str, int]]:
        if not pokedex_names:
            return []
        pipeline = [
            {"$match": {"pokedex": {"$in": pokedex_names}}},
            {
                "$addFields": {
                    "dex_rank": {"$indexOfArray": [pokedex_names, "$pokedex"]},
                }
            },
            {"$match": {"dex_rank": {"$gte": 0}}},
            {"$sort": {"species_id": 1, "dex_rank": 1, "entry_number": 1}},
            {
                "$group": {
                    "_id": "$species_id",
                    "number": {"$first": "$entry_number"},
                    "dex_rank": {"$first": "$dex_rank"},
                }
            },
            {"$sort": {"dex_rank": 1, "number": 1, "_id": 1}},
            {"$project": {"_id": 0, "id": "$_id", "number": 1}},
        ]
        return list(PokedexEntryDocument.objects.aggregate(pipeline))
