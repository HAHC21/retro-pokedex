from mongoengine import (
    Document,
    IntField,
    StringField,
)


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
