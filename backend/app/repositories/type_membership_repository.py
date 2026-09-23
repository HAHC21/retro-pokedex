"""Compiled National Dex type → pokemon id membership."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from mongoengine.errors import NotUniqueError

from app.db.documents import TypeMembershipDocument
from app.integrations.pokeapi.mapper import pokemon_id_from_url

NATIONAL_MAX_ID = 1025


class TypeMembershipRepository:
    """Read/write type membership served by GET /types/{type}."""

    def get_ids(self, type_name: str) -> list[int] | None:
        doc = TypeMembershipDocument.objects(type_name=type_name).first()
        if doc is None:
            return None
        return [int(pokemon_id) for pokemon_id in (doc.pokemon_ids or [])]

    def get_all(self, type_names: list[str] | tuple[str, ...]) -> dict[str, list[int]] | None:
        """Return type → ids for every name, or None if any type row is missing."""
        docs = {
            str(doc.type_name): [int(pokemon_id) for pokemon_id in (doc.pokemon_ids or [])]
            for doc in TypeMembershipDocument.objects(type_name__in=list(type_names))
        }
        if any(name not in docs for name in type_names):
            return None
        return docs

    def upsert(self, type_name: str, pokemon_ids: list[int]) -> list[int]:
        now = datetime.now(timezone.utc)
        ids = sorted({int(pokemon_id) for pokemon_id in pokemon_ids})
        try:
            TypeMembershipDocument.objects(type_name=type_name).modify(
                upsert=True,
                new=True,
                set__pokemon_ids=ids,
                set__built_at=now,
                set_on_insert__type_name=type_name,
            )
        except NotUniqueError:
            TypeMembershipDocument.objects(type_name=type_name).modify(
                new=True,
                set__pokemon_ids=ids,
                set__built_at=now,
            )
        return ids

    def upsert_from_type_payload(self, type_name: str, payload: dict[str, Any] | None) -> list[int]:
        ids: list[int] = []
        if payload:
            for entry in payload.get("pokemon") or []:
                if not isinstance(entry, dict):
                    continue
                url = ((entry.get("pokemon") or {}).get("url") or "") if isinstance(entry.get("pokemon"), dict) else ""
                if not url:
                    continue
                try:
                    pokemon_id = pokemon_id_from_url(url)
                except (TypeError, ValueError):
                    continue
                if 1 <= pokemon_id <= NATIONAL_MAX_ID:
                    ids.append(pokemon_id)
        return self.upsert(type_name, ids)
