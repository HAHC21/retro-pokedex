from mongoengine import DateTimeField, Document, IntField, StringField


class DataGapDocument(Document):
    """One open miss: the app was asked for stored game data it does not have."""

    meta = {
        "collection": "data_gaps",
        "indexes": [
            {"fields": ["kind", "subject"], "unique": True},
            {"fields": ["resolved_at", "-last_seen_at"]},
        ],
    }

    kind = StringField(required=True)
    subject = StringField(required=True)
    resource_id = IntField(null=True)
    game_key = StringField(null=True)
    form = StringField(null=True)
    hits = IntField(required=True, default=1)
    first_seen_at = DateTimeField(required=True)
    last_seen_at = DateTimeField(required=True)
    resolved_at = DateTimeField(null=True)
