from mongoengine import (
    EmbeddedDocument,
    IntField,
)


class PokemonStats(EmbeddedDocument):
    """Base stats for one form. They belong to that form's database row."""

    hp = IntField(required=True)
    attack = IntField(required=True)
    defense = IntField(required=True)
    special_attack = IntField(required=True)
    special_defense = IntField(required=True)
    speed = IntField(required=True)
