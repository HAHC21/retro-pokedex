from mongoengine import (
    DateTimeField,
    Document,
    ObjectIdField,
    StringField,
)


class PokemonOverviewDocument(Document):
    """Lore overview for one Pokémon row, referenced by that row's database id."""

    meta = {
        "collection": "pokemon_overviews",
        "indexes": [
            {"fields": ["pokemon"], "unique": True},
            {"fields": ["name"]},
        ],
    }

    pokemon = ObjectIdField(required=True)
    name = StringField(required=True)
    overview = StringField(required=True)
    overview_es = StringField(null=True)
    source = StringField(required=True, default="gemini")
    model = StringField(null=True)
    generated_at = DateTimeField(required=True)
    updated_at = DateTimeField(required=True)
