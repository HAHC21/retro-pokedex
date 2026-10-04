from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ScanQuota:
    allowance: int
    used: int
    remaining: int
    new_account: bool
    next_available_at: datetime | None
    exempt: bool = False
