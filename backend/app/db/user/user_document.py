from mongoengine import (
    DateTimeField,
    Document,
    StringField,
)
from app.domain.roles import ROLE_USER


class UserDocument(Document):
    meta = {
        "collection": "users",
        "indexes": [
            {"fields": ["email"]},
            {"fields": ["role"]},
            {"fields": ["created_at"]},
        ],
    }

    user_id = StringField(primary_key=True)
    email = StringField(null=True)
    name = StringField(null=True)
    avatar_url = StringField(null=True)
    password_hash = StringField(null=True)
    email_verified_at = DateTimeField(null=True)
    role = StringField(required=True, default=ROLE_USER)
    created_at = DateTimeField(required=True)
    last_login_at = DateTimeField(required=True)
