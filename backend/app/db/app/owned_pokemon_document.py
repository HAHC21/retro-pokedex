from mongoengine import (
    BooleanField,
    DateTimeField,
    Document,
    EmbeddedDocumentField,
    IntField,
    ListField,
    StringField,
)
from app.db.app.owned_pokemon_move import OwnedPokemonMove
from app.db.app.owned_pokemon_stats import OwnedPokemonStats


class OwnedPokemonDocument(Document):
    """A concrete Pokémon owned by a user (parsed from sav/PK, not just a dex mark)."""

    meta = {
        "collection": "owned_pokemon",
        "indexes": [
            {"fields": ["user_id", "pokemon_id"]},
            {"fields": ["user_id", "game_key"]},
            {"fields": ["user_id", "import_id"]},
            {"fields": ["user_id", "is_party", "box_index", "slot_index"]},
            {"fields": ["user_id", "-updated_at"]},
        ],
    }

    owned_id = StringField(primary_key=True)
    user_id = StringField(required=True)
    import_id = StringField(null=True)
    source_type = StringField(required=True, default="manual")  # sav | pk | manual
    raw_format = StringField(null=True)
    raw_checksum = StringField(null=True)

    pokemon_id = IntField(required=True)
    species_slug = StringField(null=True)
    form_slug = StringField(null=True)
    nickname = StringField(null=True)
    level = IntField(null=True)
    experience = IntField(null=True)
    gender = StringField(null=True)  # male | female | genderless
    shiny = BooleanField(required=True, default=False)
    ability_name = StringField(null=True)
    ability_slot = IntField(null=True)
    nature = StringField(null=True)
    held_item = StringField(null=True)
    friendship = IntField(null=True)
    pokerus = BooleanField(required=True, default=False)
    ball = StringField(null=True)
    fateful_encounter = BooleanField(required=True, default=False)
    egg_location = StringField(null=True)

    moves = ListField(EmbeddedDocumentField(OwnedPokemonMove), default=list)
    ivs = EmbeddedDocumentField(OwnedPokemonStats, null=True)
    evs = EmbeddedDocumentField(OwnedPokemonStats, null=True)
    stats = EmbeddedDocumentField(OwnedPokemonStats, null=True)

    ot_name = StringField(null=True)
    ot_id = StringField(null=True)
    ot_gender = StringField(null=True)
    language = StringField(null=True)

    game_key = StringField(null=True)
    met_game = StringField(null=True)
    met_location = StringField(null=True)
    met_level = IntField(null=True)
    met_date = StringField(null=True)

    is_party = BooleanField(required=True, default=False)
    box_index = IntField(null=True)
    slot_index = IntField(null=True)

    created_at = DateTimeField(required=True)
    updated_at = DateTimeField(required=True)
