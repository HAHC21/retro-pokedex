from mongoengine import (
    DateTimeField,
    Document,
    StringField,
)


class PasswordResetDocument(Document):
    meta = {
        "collection": "password_resets",
        "indexes": [
            {"fields": ["user_id"]},
            {"fields": ["expires_at"]},
        ],
    }

    token_hash = StringField(primary_key=True)
    user_id = StringField(required=True)
    expires_at = DateTimeField(required=True)
