from datetime import datetime, timezone
from typing import Any

from app.db.user.box_scan_document import BoxScanDocument
from app.services.box_scan.const import DAY, REGIONAL_FORMS, SLOT_COUNT


def day_start(now: datetime | None = None) -> datetime:
    moment = as_utc(now or datetime.now(timezone.utc))
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


def next_utc_midnight(now: datetime | None = None) -> datetime:
    return day_start(now) + DAY


def count_since(user_id: str, start: datetime) -> int:
    return int(BoxScanDocument.objects(user_id=user_id, scanned_at__gte=start).count())


def oldest_since(user_id: str, start: datetime) -> datetime | None:
    doc = BoxScanDocument.objects(user_id=user_id, scanned_at__gte=start).order_by("scanned_at").first()
    if doc is None:
        return None
    scanned_at = doc.scanned_at
    return scanned_at if isinstance(scanned_at, datetime) else None


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc)
    return value.replace(tzinfo=None)


def iso(value: datetime) -> str:
    return as_utc(value).replace(tzinfo=timezone.utc).isoformat()


def prompt(source_label: str, source: str) -> str:
    bank_note = ""
    if source == "bank":
        bank_note = """
This picture is Pokémon Bank on a Nintendo 3DS, not Pokémon HOME and not a Switch game.
The icons are the smaller 3DS box sprites. The 30-slot grid is usually on the upper screen; ignore the lower screen if both are visible.
Bank only stores National Dex 1 through 807. Alolan forms can appear. Galarian, Hisuian, and Paldean forms cannot. Do not assign those later forms.
"""
    return f"""You identify Pokémon in one PC box screenshot for a living dex.

The screenshot is from: {source_label}.
{bank_note}
The box is 6 columns by 5 rows, 30 slots, read left to right, top to bottom.

Compare every icon against the full National Pokédex, species 1 through 1025, and against regional forms: Alolan, Galarian, Hisuian, and Paldean.
If the source is Pokémon Bank, stop at species 807 and Alolan forms, as described above.

Do not guess. Check each Pokémon in the picture and report only what you can verify.
If a slot is empty, set empty to true and pokemon_id to null.
If a slot has a Pokémon you cannot identify confidently, set empty to false and pokemon_id to null. Do not invent a species to fill it.
Mark shiny only when the colors are clearly the shiny palette.
Set form only when the design is clearly that regional form. Otherwise form is null, meaning the standard form.

Return JSON only, with exactly 30 slots:
{{
  "slots": [
    {{"slot": 1, "empty": false, "pokemon_id": 6, "name": "Charizard", "form": null, "shiny": false}}
  ]
}}

slot is 1 through 30.
pokemon_id is the National Dex number of the base species, from 1 to 1025, including when the form is regional.
form is null, "alola", "galar", "hisui", or "paldea".
"""


def slots(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw = payload.get("slots")
    by_index: dict[int, dict[str, Any]] = {}
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            index = slot_index(item.get("slot"))
            if index is None or index in by_index:
                continue
            by_index[index] = one_slot(item)
    return [by_index.get(index) or unknown_slot(index) for index in range(SLOT_COUNT)]


def one_slot(item: dict[str, Any]) -> dict[str, Any]:
    empty = bool(item.get("empty"))
    pokemon_id = None if empty else species_id(item.get("pokemon_id"))
    identified = pokemon_id is not None
    return {
        "empty": empty,
        "pokemon_id": pokemon_id,
        "form": form_name(item.get("form")) if identified else None,
        "shiny": bool(item.get("shiny")) if identified else False,
        "identified": identified,
    }


def unknown_slot(_index: int) -> dict[str, Any]:
    return {"empty": False, "pokemon_id": None, "form": None, "shiny": False, "identified": False}


def slot_index(value: Any) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    if number < 1 or number > SLOT_COUNT:
        return None
    return number - 1


def species_id(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    if number < 1 or number > 1025:
        return None
    return number


def form_name(value: Any) -> str | None:
    if value is None:
        return None
    key = str(value).strip().lower()
    if key in {"", "null", "none", "base", "standard", "normal"}:
        return None
    return REGIONAL_FORMS.get(key)
