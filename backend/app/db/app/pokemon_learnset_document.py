from mongoengine import DateTimeField, DictField, Document, IntField, ListField, StringField


class PokemonLearnsetDocument(Document):
    """Compiled move groups for one base or regional form in one game."""

    meta = {
        "collection": "pokemon_learnsets",
        "indexes": [{"fields": ["resource_id", "game_key"], "unique": True}],
    }

    resource_id = IntField(required=True)
    game_key = StringField(required=True)
    form = StringField(required=True)
    groups = ListField(DictField(), default=list)
    built_at = DateTimeField(required=True)
