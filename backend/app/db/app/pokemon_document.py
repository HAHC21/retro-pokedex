from mongoengine import (
    BooleanField,
    DateTimeField,
    Document,
    EmbeddedDocumentField,
    IntField,
    ListField,
    StringField,
)
from app.db.app.pokemon_stats import PokemonStats


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
