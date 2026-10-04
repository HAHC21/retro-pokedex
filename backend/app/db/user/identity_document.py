from mongoengine import (
    Document,
    StringField,
)


class IdentityDocument(Document):
    meta = {
        "collection": "identities",
        "indexes": [
            {"fields": ["provider", "subject"], "unique": True},
            {"fields": ["user_id"]},
        ],
    }

    provider = StringField(required=True)
    subject = StringField(required=True)
    user_id = StringField(required=True)
    email = StringField(null=True)
