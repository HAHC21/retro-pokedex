from mongoengine import (
    DateTimeField,
    Document,
    IntField,
    StringField,
)


class PokedexSyncMeta(Document):
    """Tracks when flattened pokedex rows were last synced from cached PokéAPI JSON."""

    meta = {"collection": "pokedex_sync_meta"}

    pokedex = StringField(primary_key=True)
    synced_at = DateTimeField(required=True)
    entry_count = IntField(required=True)
