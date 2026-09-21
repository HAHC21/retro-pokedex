from datetime import datetime

from mongoengine import (
    BooleanField,
    DateTimeField,
    DictField,
    Document,
    EmbeddedDocument,
    EmbeddedDocumentField,
    IntField,
    ListField,
    StringField,
)


class PokeApiCacheEntry(Document):
    """Cached PokéAPI JSON keyed by request path (e.g. pokemon/25)."""

    meta = {
        "collection": "pokeapi_cache",
        "indexes": [
            {"fields": ["path"], "unique": True},
        ],
    }

    path = StringField(required=True)
    # Always {"data": <payload>} so lists and objects both fit DictField.
    body = DictField(required=True)
    fetched_at = DateTimeField(required=True)
    etag = StringField(null=True)


class PokedexEntryDocument(Document):
    """Flattened Pokédex rows for Mongo aggregation of regional dexes."""

    meta = {
        "collection": "pokedex_entries",
        "indexes": [
            {"fields": ["pokedex", "species_id"], "unique": True},
            {"fields": ["pokedex", "entry_number"]},
        ],
    }

    pokedex = StringField(required=True)
    species_id = IntField(required=True)
    entry_number = IntField(required=True)


class PokedexSyncMeta(Document):
    """Tracks when flattened pokedex rows were last synced from cached PokéAPI JSON."""

    meta = {"collection": "pokedex_sync_meta"}

    pokedex = StringField(primary_key=True)
    synced_at = DateTimeField(required=True)
    entry_count = IntField(required=True)


class MovePastValue(EmbeddedDocument):
    """Historical move stats; version_group marks when newer values began."""

    version_group = StringField(required=True)
    version_group_id = IntField(required=True)
    type = StringField(null=True)
    power = IntField(null=True)
    accuracy = IntField(null=True)
    pp = IntField(null=True)


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


class PokemonOverviewDocument(Document):
    """Gemini-generated lore overview for a National Dex species."""

    meta = {
        "collection": "pokemon_overviews",
        "indexes": [
            {"fields": ["pokemon_id"], "unique": True},
            {"fields": ["name"]},
        ],
    }

    pokemon_id = IntField(required=True)
    name = StringField(required=True)
    overview = StringField(required=True)
    source = StringField(required=True, default="gemini")
    model = StringField(null=True)
    generated_at = DateTimeField(required=True)
    updated_at = DateTimeField(required=True)


class PokemonAiMovesetDocument(Document):
    """Persisted Gemini moveset suggestions for a Pokémon + game."""

    meta = {
        "collection": "pokemon_ai_movesets",
        "indexes": [
            {"fields": ["pokemon_id", "game"], "unique": True},
            {"fields": ["game"]},
        ],
    }

    pokemon_id = IntField(required=True)
    game = StringField(required=True)
    available = BooleanField(required=True, default=True)
    provider = StringField(null=True)
    model = StringField(null=True)
    message = StringField(null=True)
    sets = ListField(DictField(), default=list)
    generated_at = DateTimeField(required=True)
    updated_at = DateTimeField(required=True)


class UserCollectionMarkDocument(Document):
    """Per-user caught/shiny mark for a Pokémon in a specific game save."""

    meta = {
        "collection": "user_collection_marks",
        "indexes": [
            {"fields": ["user_id", "game", "pokemon_id"], "unique": True},
            {"fields": ["user_id", "game"]},
            {"fields": ["user_id"]},
        ],
    }

    user_id = StringField(required=True)
    game = StringField(required=True)
    pokemon_id = IntField(required=True)
    caught = BooleanField(required=True, default=False)
    caught_at = IntField(null=True)  # epoch ms, matches frontend
    shiny = BooleanField(required=True, default=False)
    shiny_at = IntField(null=True)
    updated_at = DateTimeField(required=True)


class OwnedPokemonMove(EmbeddedDocument):
    """One move slot on an owned Pokémon instance (from sav/PK parse)."""

    slot = IntField(required=True)
    move_id = IntField(null=True)
    name = StringField(null=True)
    pp = IntField(null=True)
    pp_ups = IntField(null=True)


class OwnedPokemonStats(EmbeddedDocument):
    hp = IntField(null=True)
    attack = IntField(null=True)
    defense = IntField(null=True)
    special_attack = IntField(null=True)
    special_defense = IntField(null=True)
    speed = IntField(null=True)


class UserPokemonImportDocument(Document):
    """Metadata for an uploaded .sav / .pk* file awaiting or after parse."""

    meta = {
        "collection": "user_pokemon_imports",
        "indexes": [
            {"fields": ["user_id", "-uploaded_at"]},
            {"fields": ["user_id", "status"]},
        ],
    }

    import_id = StringField(primary_key=True)
    user_id = StringField(required=True)
    source_type = StringField(required=True)  # sav | pk
    filename = StringField(required=True)
    content_type = StringField(null=True)
    size_bytes = IntField(null=True)
    storage_key = StringField(null=True)  # future object-store / disk path
    game_key = StringField(null=True)
    generation = IntField(null=True)
    format_hint = StringField(null=True)  # pk6, pk7, pk8, pk9, gen3sav, …
    status = StringField(required=True, default="pending")  # pending|parsed|failed
    error_message = StringField(null=True)
    pokemon_count = IntField(required=True, default=0)
    uploaded_at = DateTimeField(required=True)
    parsed_at = DateTimeField(null=True)


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
