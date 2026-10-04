from mongoengine import (
    DateTimeField,
    Document,
    IntField,
    ListField,
    StringField,
)


class TypeMembershipDocument(Document):
    """Compiled National Dex pokemon ids for one attacking type."""

    meta = {
        "collection": "type_membership",
        "indexes": [
            {"fields": ["type_name"], "unique": True},
        ],
    }

    type_name = StringField(required=True)
    pokemon_ids = ListField(IntField(), default=list)
    built_at = DateTimeField(required=True)
