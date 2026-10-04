from mongoengine import BooleanField, Document, IntField, ListField, StringField


class GameDocument(Document):
    """One save slot: label, generation, PokéAPI versions, and regional dex names."""

    meta = {
        "collection": "games",
        "indexes": [{"fields": ["key"], "unique": True}],
    }

    key = StringField(required=True)
    label = StringField(required=True)
    generation = IntField(null=True)
    all_versions = BooleanField(required=True, default=False)
    versions = ListField(StringField(), default=list)
    pokedexes = ListField(StringField(), default=list)
    all_version_groups = BooleanField(required=True, default=False)
    version_groups = ListField(StringField(), default=list)
