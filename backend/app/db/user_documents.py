from datetime import datetime

from mongoengine import DateTimeField, Document, StringField


class UserDocument(Document):
    meta = {
        "collection": "users",
        "indexes": [
            {"fields": ["email"]},
        ],
    }

    user_id = StringField(primary_key=True)
    email = StringField(null=True)
    name = StringField(null=True)
    avatar_url = StringField(null=True)
    password_hash = StringField(null=True)
    email_verified_at = DateTimeField(null=True)
    created_at = DateTimeField(required=True)
    last_login_at = DateTimeField(required=True)


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
