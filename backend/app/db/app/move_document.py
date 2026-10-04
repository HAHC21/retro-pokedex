from mongoengine import (
    DateTimeField,
    Document,
    EmbeddedDocumentField,
    IntField,
    ListField,
    StringField,
)
from app.db.app.move_past_value import MovePastValue


class MoveDocument(Document):
    """Canonical move catalog synced from PokéAPI for learnset enrichment."""

    meta = {
        "collection": "moves",
        "indexes": [
            {"fields": ["move_id"], "unique": True},
            {"fields": ["name"], "unique": True},
        ],
    }

    move_id = IntField(required=True)
    name = StringField(required=True)
    display_name = StringField(required=True)
    type = StringField(required=True)
    damage_class = StringField(required=True)
    power = IntField(null=True)
    accuracy = IntField(null=True)
    pp = IntField(null=True)
    priority = IntField(required=True, default=0)
    past_values = ListField(EmbeddedDocumentField(MovePastValue), default=list)
    synced_at = DateTimeField(required=True)
