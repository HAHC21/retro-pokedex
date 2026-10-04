from mongoengine import (
    DateTimeField,
    DictField,
    Document,
    IntField,
    StringField,
)


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
