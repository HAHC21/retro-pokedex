from mongoengine import (
    DateTimeField,
    DictField,
    Document,
    IntField,
    StringField,
)


class PokemonNamesDocument(Document):
    """Compiled National Dex display names (slim singleton from species list)."""

    meta = {
        "collection": "pokemon_names",
        "indexes": [
            {"fields": ["key"], "unique": True},
        ],
    }

    key = StringField(required=True, default="national")
    count = IntField(required=True)
    names = DictField(required=True, default=dict)  # id str → display name
    built_at = DateTimeField(required=True)
