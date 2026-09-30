from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from app.db.user_documents import BoxScanDocument
from app.domain.roles import is_staff
from app.domain.user import User
from app.integrations.gemini.client import GeminiImageResult, GeminiMovesetClient, GeminiUsage

SOURCES = {
    "home": "Pokémon HOME",
    "bank": "Pokémon Bank",
    "sv": "Pokémon Scarlet / Violet",
    "swsh": "Pokémon Sword / Shield",
    "switch2": "Nintendo Switch 2",
    "switch": "Nintendo Switch",
}

REGIONAL_FORMS = {
    "alola": "alola",
    "alolan": "alola",
    "galar": "galar",
    "galarian": "galar",
    "hisui": "hisui",
    "hisuian": "hisui",
    "paldea": "paldea",
    "paldean": "paldea",
}

SLOT_COUNT = 30
NEW_ACCOUNT_WINDOW = timedelta(hours=48)
DAY = timedelta(hours=24)
NEW_ACCOUNT_CAP = 1
DAILY_CAP = 2
DAILY_BUDGET_USD = 1.0
# TEMPORARY: pretend the shared daily budget is already spent so the scan page can be checked.
FORCE_GLOBAL_SCAN_LIMIT = False
# USD per 1M tokens. Output rate includes thinking tokens. Matches generate_overviews.py.
MODEL_PRICES_PER_M: dict[str, tuple[float, float]] = {
    "gemini-3.5-flash-lite": (0.30, 2.50),
    "gemini-3.6-flash-lite": (0.30, 2.50),
    "gemini-3.1-flash-lite": (0.25, 1.50),
    "gemini-3.6-flash": (1.50, 7.50),
    "gemini-3.5-flash": (1.50, 9.00),
}
DEFAULT_PRICE_PER_M = (0.30, 2.50)
# Used only when Gemini omits token counts, so a scan still counts toward the daily budget.
FALLBACK_SCAN_USD = 0.0022


class BoxScanError(RuntimeError):
    pass


class ScanBudgetError(BoxScanError):
    def __init__(self, resets_at: datetime) -> None:
        super().__init__("global_budget")
        self.resets_at = resets_at


class ScanLimitError(BoxScanError):
    def __init__(self, next_available_at: datetime | None) -> None:
        super().__init__("scan_limit")
        self.next_available_at = next_available_at


@dataclass(frozen=True)
class ScanQuota:
    allowance: int
    used: int
    remaining: int
    new_account: bool
    next_available_at: datetime | None
    exempt: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "allowance": self.allowance,
            "used": self.used,
            "remaining": self.remaining,
            "new_account": self.new_account,
            "next_available_at": _iso(self.next_available_at) if self.next_available_at else None,
            "global_limit_reached": False if self.exempt else global_limit_reached(),
            "global_resets_at": _iso(_next_utc_midnight()),
            "exempt": self.exempt,
        }


def scan_quota(user: User, now: datetime | None = None) -> ScanQuota:
    moment = _utc(now or datetime.now(timezone.utc))
    created = _utc(user.created_at)
    exempt = is_staff(user.role)
    if moment < created + NEW_ACCOUNT_WINDOW:
        used = _count_since(user.id, created)
        remaining = max(0, NEW_ACCOUNT_CAP - used)
        return ScanQuota(
            allowance=NEW_ACCOUNT_CAP,
            used=used,
            remaining=remaining,
            new_account=True,
            next_available_at=None if remaining else created + NEW_ACCOUNT_WINDOW,
            exempt=exempt,
        )
    window_start = moment - DAY
    used = _count_since(user.id, window_start)
    remaining = max(0, DAILY_CAP - used)
    next_at = None
    if remaining == 0:
        oldest = _oldest_since(user.id, window_start)
        next_at = _utc(oldest) + DAY if oldest else moment + DAY
    return ScanQuota(
        allowance=DAILY_CAP,
        used=used,
        remaining=remaining,
        new_account=False,
        next_available_at=next_at,
        exempt=exempt,
    )


def reserve_scan(user: User) -> str:
    """Hold one scan before Gemini runs. Parallel requests cannot pass the cap."""
    moment = _utc(datetime.now(timezone.utc))
    exempt = is_staff(user.role)
    if not exempt:
        quota = scan_quota(user, moment)
        if quota.remaining < 1:
            raise ScanLimitError(quota.next_available_at)
    scan_id = str(uuid4())
    BoxScanDocument(scan_id=scan_id, user_id=user.id, scanned_at=moment).save()
    if not exempt:
        confirmed = scan_quota(user, moment)
        if confirmed.used > confirmed.allowance:
            BoxScanDocument.objects(scan_id=scan_id).delete()
            raise ScanLimitError(confirmed.next_available_at)
    return scan_id


def release_scan(scan_id: str) -> None:
    BoxScanDocument.objects(scan_id=scan_id).delete()


def assert_global_budget(user: User, now: datetime | None = None) -> None:
    if is_staff(user.role):
        return
    if global_limit_reached(now):
        raise ScanBudgetError(_next_utc_midnight(now))


def record_scan_cost(scan_id: str, result: GeminiImageResult) -> float:
    prompt_tokens = result.usage.prompt_tokens
    output_tokens = result.usage.candidates_tokens + result.usage.thoughts_tokens
    cost = scan_cost_usd(result.model, result.usage)
    BoxScanDocument.objects(scan_id=scan_id).update_one(
        set__cost_usd=cost,
        set__model=result.model,
        set__prompt_tokens=prompt_tokens,
        set__output_tokens=output_tokens,
    )
    return cost


def global_limit_reached(now: datetime | None = None) -> bool:
    if FORCE_GLOBAL_SCAN_LIMIT:
        return True
    return round(global_spend_usd(now), 6) >= DAILY_BUDGET_USD


def global_spend_usd(now: datetime | None = None) -> float:
    start = _day_start(now)
    total = 0.0
    for doc in BoxScanDocument.objects(scanned_at__gte=start).only("cost_usd"):
        total += float(doc.cost_usd or 0)
    return total


def scan_cost_usd(model: str, usage: GeminiUsage) -> float:
    prompt_tokens = usage.prompt_tokens
    output_tokens = usage.candidates_tokens + usage.thoughts_tokens
    if prompt_tokens <= 0 and output_tokens <= 0:
        return FALLBACK_SCAN_USD
    input_rate, output_rate = MODEL_PRICES_PER_M.get(model, DEFAULT_PRICE_PER_M)
    cost = (prompt_tokens * input_rate + output_tokens * output_rate) / 1_000_000
    return round(cost, 6)


def _day_start(now: datetime | None = None) -> datetime:
    moment = _utc(now or datetime.now(timezone.utc))
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


def _next_utc_midnight(now: datetime | None = None) -> datetime:
    return _day_start(now) + DAY


def _count_since(user_id: str, start: datetime) -> int:
    return int(BoxScanDocument.objects(user_id=user_id, scanned_at__gte=start).count())


def _oldest_since(user_id: str, start: datetime) -> datetime | None:
    doc = BoxScanDocument.objects(user_id=user_id, scanned_at__gte=start).order_by("scanned_at").first()
    if doc is None:
        return None
    scanned_at = doc.scanned_at
    return scanned_at if isinstance(scanned_at, datetime) else None


def _utc(value: datetime) -> datetime:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc)
    return value.replace(tzinfo=None)


def _iso(value: datetime) -> str:
    return _utc(value).replace(tzinfo=timezone.utc).isoformat()


async def analyze_box_screenshot(
    gemini: GeminiMovesetClient,
    *,
    source: str,
    image: bytes,
    mime_type: str,
) -> tuple[list[dict[str, Any]], GeminiImageResult]:
    label = SOURCES.get(source)
    if label is None:
        raise BoxScanError("Unknown screenshot source")
    if not gemini.available:
        raise BoxScanError("Scanner is not configured")
    if not image:
        raise BoxScanError("The screenshot was empty")
    prompt = _prompt(label, source)
    try:
        result = await gemini.analyze_image(prompt=prompt, image=image, mime_type=mime_type)
    except RuntimeError as exc:
        raise BoxScanError("Could not read that screenshot") from exc
    return _slots(result.data), result


def _prompt(source_label: str, source: str) -> str:
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


def _slots(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw = payload.get("slots")
    by_index: dict[int, dict[str, Any]] = {}
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            index = _slot_index(item.get("slot"))
            if index is None or index in by_index:
                continue
            by_index[index] = _one(item)
    return [by_index.get(index) or _unknown(index) for index in range(SLOT_COUNT)]


def _one(item: dict[str, Any]) -> dict[str, Any]:
    empty = bool(item.get("empty"))
    pokemon_id = None if empty else _species_id(item.get("pokemon_id"))
    identified = pokemon_id is not None
    return {
        "empty": empty,
        "pokemon_id": pokemon_id,
        "form": _form(item.get("form")) if identified else None,
        "shiny": bool(item.get("shiny")) if identified else False,
        "identified": identified,
    }


def _unknown(_index: int) -> dict[str, Any]:
    return {"empty": False, "pokemon_id": None, "form": None, "shiny": False, "identified": False}


def _slot_index(value: Any) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    if number < 1 or number > SLOT_COUNT:
        return None
    return number - 1


def _species_id(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    if number < 1 or number > 1025:
        return None
    return number


def _form(value: Any) -> str | None:
    if value is None:
        return None
    key = str(value).strip().lower()
    if key in {"", "null", "none", "base", "standard", "normal"}:
        return None
    return REGIONAL_FORMS.get(key)
