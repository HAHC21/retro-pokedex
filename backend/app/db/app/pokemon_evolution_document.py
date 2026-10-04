from mongoengine import (
    DateTimeField,
    DictField,
    Document,
    IntField,
    ListField,
    StringField,
)


class PokemonEvolutionDocument(Document):
    """Compiled evolution steps + acquisition evolve label for one species."""

    meta = {
        "collection": "pokemon_evolution",
        "indexes": [
            {"fields": ["pokemon_id", "form"], "unique": True},
        ],
    }

    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    steps = ListField(DictField(), default=list)
    parent_id = IntField(null=True)
    parent_name = StringField(null=True)
    evolve_label = StringField(null=True)
    built_at = DateTimeField(required=True)
