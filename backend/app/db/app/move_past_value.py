from mongoengine import (
    EmbeddedDocument,
    IntField,
    StringField,
)


class MovePastValue(EmbeddedDocument):
    """Historical move stats; version_group marks when newer values began."""

    version_group = StringField(required=True)
    version_group_id = IntField(required=True)
    type = StringField(null=True)
    power = IntField(null=True)
    accuracy = IntField(null=True)
    pp = IntField(null=True)
