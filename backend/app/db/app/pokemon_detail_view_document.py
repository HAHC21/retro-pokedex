from mongoengine import (
    DateTimeField,
    DictField,
    Document,
    IntField,
    StringField,
)


class PokemonDetailViewDocument(Document):
    """SPA-shaped detail payload for GET /api/poke/pokemon/{id}."""

    meta = {
        "collection": "pokemon_detail_view",
        "indexes": [
            {"fields": ["pokemon_id", "form"], "unique": True},
        ],
    }

    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    payload = DictField(required=True)
    built_at = DateTimeField(required=True)
