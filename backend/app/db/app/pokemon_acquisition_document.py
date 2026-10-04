from mongoengine import (
    DateTimeField,
    DictField,
    Document,
    IntField,
)


class PokemonAcquisitionDocument(Document):
    """Compiled how-to-obtain lines per game for one species."""

    meta = {
        "collection": "pokemon_acquisition",
        "indexes": [
            {"fields": ["pokemon_id"], "unique": True},
        ],
    }

    pokemon_id = IntField(required=True)
    by_game = DictField(required=True, default=dict)  # game_key → {text, methods}
    built_at = DateTimeField(required=True)
