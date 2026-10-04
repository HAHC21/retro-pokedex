from mongoengine import (
    BooleanField,
    DateTimeField,
    DictField,
    Document,
    IntField,
    ListField,
    StringField,
)


class PokemonAiMovesetDocument(Document):
    """Persisted Gemini moveset suggestions for a Pokémon + game."""

    meta = {
        "collection": "pokemon_ai_movesets",
        "indexes": [
            {"fields": ["pokemon_id", "form", "game"], "unique": True},
            {"fields": ["game"]},
        ],
    }

    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    game = StringField(required=True)
    available = BooleanField(required=True, default=True)
    provider = StringField(null=True)
    model = StringField(null=True)
    message = StringField(null=True)
    sets = ListField(DictField(), default=list)
    generated_at = DateTimeField(required=True)
    updated_at = DateTimeField(required=True)
