from mongoengine import (
    DateTimeField,
    DictField,
    Document,
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
