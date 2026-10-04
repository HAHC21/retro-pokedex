from mongoengine import (
    DateTimeField,
    DictField,
    Document,
    IntField,
    ListField,
    StringField,
)


class PokemonSpawnsDocument(Document):
    """Compiled wild spawn list for one National Dex species (SPA enc[] shape)."""

    meta = {
        "collection": "pokemon_spawns",
        "indexes": [
            {"fields": ["pokemon_id", "form"], "unique": True},
        ],
    }

    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    enc = ListField(DictField(), default=list)
    built_at = DateTimeField(required=True)
