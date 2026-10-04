from mongoengine import (
    DateTimeField,
    Document,
    StringField,
)


class AbilityEffectDocument(Document):
    """Compiled English ability short-effect text."""

    meta = {
        "collection": "ability_effects",
        "indexes": [
            {"fields": ["ability_name"], "unique": True},
        ],
    }

    ability_name = StringField(required=True)
    description = StringField(null=True)
    built_at = DateTimeField(required=True)
