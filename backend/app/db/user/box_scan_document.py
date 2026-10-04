from mongoengine import (
    DateTimeField,
    Document,
    FloatField,
    IntField,
    StringField,
)


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
