"""Response models for /api/scanner."""

from pydantic import BaseModel, ConfigDict


class _Open(BaseModel):
    model_config = ConfigDict(extra="allow")


class ScanQuotaRead(_Open):
    allowance: int
    used: int
    remaining: int
    new_account: bool
    next_available_at: str | None = None
    global_limit_reached: bool
    global_resets_at: str
    exempt: bool


class BoxSlotRead(_Open):
    empty: bool
    pokemon_id: int | None = None
    form: str | None = None
    shiny: bool
    identified: bool


class BoxScanRead(_Open):
    slots: list[BoxSlotRead]
