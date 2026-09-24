from datetime import datetime

from mongoengine import DateTimeField, Document, StringField


class LoginEventDocument(Document):
    """One successful sign-in. Password and OAuth logins share this collection."""

    meta = {
        "collection": "login_events",
        "indexes": [
            {"fields": ["-occurred_at"]},
            {"fields": ["user_id", "-occurred_at"]},
            {"fields": ["method", "-occurred_at"]},
        ],
    }

    event_id = StringField(primary_key=True)
    user_id = StringField(required=True)
    email = StringField(null=True)
    method = StringField(required=True)
    occurred_at = DateTimeField(required=True)
