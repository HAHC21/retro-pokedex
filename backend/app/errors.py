"""Application errors shared across services and API routes."""

from datetime import datetime


class AuthError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


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
