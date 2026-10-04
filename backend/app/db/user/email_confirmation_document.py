from mongoengine import (
    DateTimeField,
    Document,
    StringField,
)


class EmailConfirmationDocument(Document):
    meta = {
        "collection": "email_confirmations",
        "indexes": [
            {"fields": ["user_id"]},
            {"fields": ["expires_at"]},
        ],
    }

    token_hash = StringField(primary_key=True)
    user_id = StringField(required=True)
    expires_at = DateTimeField(required=True)
