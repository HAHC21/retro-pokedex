from mongoengine import (
    DateTimeField,
    Document,
    IntField,
    StringField,
)


class UserPokemonImportDocument(Document):
    """Metadata for an uploaded .sav / .pk* file awaiting or after parse."""

    meta = {
        "collection": "user_pokemon_imports",
        "indexes": [
            {"fields": ["user_id", "-uploaded_at"]},
            {"fields": ["user_id", "status"]},
            {"fields": ["source_type", "-uploaded_at"]},
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
