from mongoengine import (
    BooleanField,
    DateTimeField,
    Document,
    IntField,
    StringField,
)


class UserCollectionMarkDocument(Document):
    """Per-user caught/shiny mark for a Pokémon in a specific game save."""

    meta = {
        "collection": "user_collection_marks",
        "indexes": [
            {"fields": ["user_id", "game", "pokemon_id", "form"], "unique": True},
            {"fields": ["user_id", "game"]},
            {"fields": ["user_id"]},
            {"fields": ["updated_at"]},
        ],
    }

    user_id = StringField(required=True)
    game = StringField(required=True)
    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    caught = BooleanField(required=True, default=False)
    caught_at = IntField(null=True)  # epoch ms, matches frontend
    caught_male = BooleanField(required=True, default=False)
    caught_female = BooleanField(required=True, default=False)
    shiny = BooleanField(required=True, default=False)
    shiny_at = IntField(null=True)
    shiny_male = BooleanField(required=True, default=False)
    shiny_female = BooleanField(required=True, default=False)
    updated_at = DateTimeField(required=True)
