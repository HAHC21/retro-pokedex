from mongoengine import Document, IntField, ListField, StringField


class RegionDocument(Document):
    """Geographic region band used by the homepage. Not a game's regional Pokédex."""

    meta = {
        "collection": "regions",
        "indexes": [{"fields": ["slug"], "unique": True}],
    }

    slug = StringField(required=True)
    name = StringField(required=True)
    national_from = IntField(required=True)
    national_to = IntField(required=True)
    games = StringField(required=True)
    mascots = ListField(IntField(), default=list)
