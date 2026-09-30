from datetime import datetime

from mongoengine import DateTimeField, Document, FloatField, IntField, StringField

from app.domain.roles import ROLE_USER


class UserDocument(Document):
    meta = {
        "collection": "users",
        "indexes": [
            {"fields": ["email"]},
            {"fields": ["role"]},
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


class BoxScanDocument(Document):
    """One Gemini box scan charged to a user. Used to enforce scan limits."""

    meta = {
        "collection": "box_scans",
        "indexes": [
            {"fields": ["user_id", "-scanned_at"]},
            {"fields": ["scanned_at"]},
        ],
    }

    scan_id = StringField(primary_key=True)
    user_id = StringField(required=True)
    scanned_at = DateTimeField(required=True)
    cost_usd = FloatField(null=True)
    model = StringField(null=True)
    prompt_tokens = IntField(null=True)
    output_tokens = IntField(null=True)


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
