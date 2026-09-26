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
    ObjectIdField,
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


class PokemonStats(EmbeddedDocument):
    """Base stats for one form. They belong to that form's database row."""

    hp = IntField(required=True)
    attack = IntField(required=True)
    defense = IntField(required=True)
    special_attack = IntField(required=True)
    special_defense = IntField(required=True)
    speed = IntField(required=True)


class PokemonDocument(Document):
    """One form of a species.

    ``pokedex_id`` is the National Dex number and is shared by every form.
    ``form`` is the specificity: base, regional-alola, mega, mega-x, mega-y,
    gigantamax, or variant-yellow. Cosmetic looks share the base row and are
    not stored here; only forms with their own PokéAPI id get a variant row.
    The document id is what overviews and other per-form rows reference.
    """

    meta = {
        "collection": "pokemon",
        "indexes": [
            {"fields": ["pokedex_id", "form"], "unique": True},
            {"fields": ["resource_id"], "unique": True},
            {"fields": ["pokedex_id"]},
        ],
    }

    pokedex_id = IntField(required=True)
    form = StringField(required=True)
    capture = BooleanField(required=True, default=True)
    rarity = StringField(null=True)
    name = StringField(required=True)
    resource_id = IntField(required=True)
    types = ListField(StringField(), default=list)
    stats = EmbeddedDocumentField(PokemonStats, null=True)
    updated_at = DateTimeField(required=True)


class PokemonOverviewDocument(Document):
    """Lore overview for one Pokémon row, referenced by that row's database id."""

    meta = {
        "collection": "pokemon_overviews",
        "indexes": [
            {"fields": ["pokemon"], "unique": True},
            {"fields": ["name"]},
        ],
    }

    pokemon = ObjectIdField(required=True)
    name = StringField(required=True)
    overview = StringField(required=True)
    source = StringField(required=True, default="gemini")
    model = StringField(null=True)
    generated_at = DateTimeField(required=True)
    updated_at = DateTimeField(required=True)


class ObtainIndexDocument(Document):
    """Precomputed National Dex obtain versions + evolves_from (slim singleton).

    ``versions`` maps species id → version name list (empty lists omitted).
    ``evolves_from`` maps species id → parent id (null/base forms omitted).
    """

    meta = {
        "collection": "obtain_index",
        "indexes": [
            {"fields": ["key"], "unique": True},
        ],
    }

    key = StringField(required=True, default="national")
    count = IntField(required=True)
    versions = DictField(required=True, default=dict)
    evolves_from = DictField(required=True, default=dict)
    built_at = DateTimeField(required=True)


class PokemonNamesDocument(Document):
    """Compiled National Dex display names (slim singleton from species list)."""

    meta = {
        "collection": "pokemon_names",
        "indexes": [
            {"fields": ["key"], "unique": True},
        ],
    }

    key = StringField(required=True, default="national")
    count = IntField(required=True)
    names = DictField(required=True, default=dict)  # id str → display name
    built_at = DateTimeField(required=True)


class TypeMembershipDocument(Document):
    """Compiled National Dex pokemon ids for one attacking type."""

    meta = {
        "collection": "type_membership",
        "indexes": [
            {"fields": ["type_name"], "unique": True},
        ],
    }

    type_name = StringField(required=True)
    pokemon_ids = ListField(IntField(), default=list)
    built_at = DateTimeField(required=True)


class LocationMetaDocument(Document):
    """Compiled location-area → location name + region title."""

    meta = {
        "collection": "location_meta",
        "indexes": [
            {"fields": ["area_name"], "unique": True},
            {"fields": ["area_id"]},
        ],
    }

    area_name = StringField(required=True)
    area_id = IntField(null=True)
    loc_name = StringField(null=True)
    region = StringField(null=True)
    built_at = DateTimeField(required=True)


class PokemonSpawnsDocument(Document):
    """Compiled wild spawn list for one National Dex species (SPA enc[] shape)."""

    meta = {
        "collection": "pokemon_spawns",
        "indexes": [
            {"fields": ["pokemon_id", "form"], "unique": True},
        ],
    }

    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    enc = ListField(DictField(), default=list)
    built_at = DateTimeField(required=True)


class PokemonEvolutionDocument(Document):
    """Compiled evolution steps + acquisition evolve label for one species."""

    meta = {
        "collection": "pokemon_evolution",
        "indexes": [
            {"fields": ["pokemon_id", "form"], "unique": True},
        ],
    }

    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    steps = ListField(DictField(), default=list)
    parent_id = IntField(null=True)
    parent_name = StringField(null=True)
    evolve_label = StringField(null=True)
    built_at = DateTimeField(required=True)


class PokemonAcquisitionDocument(Document):
    """Compiled how-to-obtain lines per game for one species."""

    meta = {
        "collection": "pokemon_acquisition",
        "indexes": [
            {"fields": ["pokemon_id"], "unique": True},
        ],
    }

    pokemon_id = IntField(required=True)
    by_game = DictField(required=True, default=dict)  # game_key → {text, methods}
    built_at = DateTimeField(required=True)


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


class PokemonDetailViewDocument(Document):
    """SPA-shaped detail payload for GET /pokemon/{id} (no fat PokéAPI leftovers)."""

    meta = {
        "collection": "pokemon_detail_view",
        "indexes": [
            {"fields": ["pokemon_id", "form"], "unique": True},
        ],
    }

    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    payload = DictField(required=True)
    built_at = DateTimeField(required=True)


class PokemonAiMovesetDocument(Document):
    """Persisted Gemini moveset suggestions for a Pokémon + game."""

    meta = {
        "collection": "pokemon_ai_movesets",
        "indexes": [
            {"fields": ["pokemon_id", "form", "game"], "unique": True},
            {"fields": ["game"]},
        ],
    }

    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
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
            {"fields": ["user_id", "game", "pokemon_id", "form"], "unique": True},
            {"fields": ["user_id", "game"]},
            {"fields": ["user_id"]},
        ],
    }

    user_id = StringField(required=True)
    game = StringField(required=True)
    pokemon_id = IntField(required=True)
    form = StringField(required=True, default="base")
    caught = BooleanField(required=True, default=False)
    caught_at = IntField(null=True)  # epoch ms, matches frontend
    caught_male = BooleanField(required=True, default=False)
    caught_female = BooleanField(required=True, default=False)
    shiny = BooleanField(required=True, default=False)
    shiny_at = IntField(null=True)
    shiny_male = BooleanField(required=True, default=False)
    shiny_female = BooleanField(required=True, default=False)
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
