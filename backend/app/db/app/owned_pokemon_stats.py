from mongoengine import (
    EmbeddedDocument,
    IntField,
)


class OwnedPokemonStats(EmbeddedDocument):
    hp = IntField(null=True)
    attack = IntField(null=True)
    defense = IntField(null=True)
    special_attack = IntField(null=True)
    special_defense = IntField(null=True)
    speed = IntField(null=True)
