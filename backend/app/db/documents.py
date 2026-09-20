from datetime import datetime

from mongoengine import (
    DateTimeField,
    DictField,
    Document,
    EmbeddedDocument,
    EmbeddedDocumentField,
    IntField,
    ListField,
    StringField,
)


class PokeApiCacheEntry(Document):
    """Cached PokéAPI JSON keyed by request path (e.g. pokemon/25)."""

    meta = {
        "collection": "pokeapi_cache",
        "indexes": [
            {"fields": ["path"], "unique": True},
        ],
    }

    path = StringField(required=True)
    # Always {"data": <payload>} so lists and objects both fit DictField.
    body = DictField(required=True)
    fetched_at = DateTimeField(required=True)
    etag = StringField(null=True)


class PokedexEntryDocument(Document):
    """Flattened Pokédex rows for Mongo aggregation of regional dexes."""

    meta = {
        "collection": "pokedex_entries",
        "indexes": [
            {"fields": ["pokedex", "species_id"], "unique": True},
            {"fields": ["pokedex", "entry_number"]},
        ],
    }

    pokedex = StringField(required=True)
    species_id = IntField(required=True)
    entry_number = IntField(required=True)


class PokedexSyncMeta(Document):
    """Tracks when flattened pokedex rows were last synced from cached PokéAPI JSON."""

    meta = {"collection": "pokedex_sync_meta"}

    pokedex = StringField(primary_key=True)
    synced_at = DateTimeField(required=True)
    entry_count = IntField(required=True)


class MovePastValue(EmbeddedDocument):
    """Historical move stats; version_group marks when newer values began."""

    version_group = StringField(required=True)
    version_group_id = IntField(required=True)
    type = StringField(null=True)
    power = IntField(null=True)
    accuracy = IntField(null=True)
    pp = IntField(null=True)


class MoveDocument(Document):
    """Canonical move catalog synced from PokéAPI for learnset enrichment."""

    meta = {
        "collection": "moves",
        "indexes": [
            {"fields": ["move_id"], "unique": True},
            {"fields": ["name"], "unique": True},
        ],
    }

    move_id = IntField(required=True)
    name = StringField(required=True)
    display_name = StringField(required=True)
    type = StringField(required=True)
    damage_class = StringField(required=True)
    power = IntField(null=True)
    accuracy = IntField(null=True)
    pp = IntField(null=True)
    priority = IntField(required=True, default=0)
    past_values = ListField(EmbeddedDocumentField(MovePastValue), default=list)
    synced_at = DateTimeField(required=True)
