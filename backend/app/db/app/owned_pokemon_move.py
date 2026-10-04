from mongoengine import (
    EmbeddedDocument,
    IntField,
    StringField,
)


class OwnedPokemonMove(EmbeddedDocument):
    """One move slot on an owned Pokémon instance (from sav/PK parse)."""

    slot = IntField(required=True)
    move_id = IntField(null=True)
    name = StringField(null=True)
    pp = IntField(null=True)
    pp_ups = IntField(null=True)
