from mongoengine import (
    DateTimeField,
    Document,
    IntField,
    StringField,
)


class LocationMetaDocument(Document):
    """Compiled location-area → location name + region title."""

    meta = {
        "collection": "location_meta",
        "indexes": [
            {"fields": ["area_name"], "unique": True},
            {"fields": ["area_id"]},
        ],
    }

    area_name = StringField(required=True)
    area_id = IntField(null=True)
    loc_name = StringField(null=True)
    region = StringField(null=True)
    built_at = DateTimeField(required=True)
