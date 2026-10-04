from mongoengine import Document, IntField, StringField


class GenerationDocument(Document):
    """National Dex generation band. Static; seeded by the compile script."""

    meta = {
        "collection": "generations",
        "indexes": [{"fields": ["generation_id"], "unique": True}],
    }

    generation_id = IntField(required=True)
    roman = StringField(required=True)
    national_from = IntField(required=True)
    national_to = IntField(required=True)
    games = StringField(required=True)
