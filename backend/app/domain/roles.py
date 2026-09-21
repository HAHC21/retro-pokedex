"""Account roles for privilege checks.

Each user has one role. Admin and developer are staff titles with the same
privileges — never gate a feature on admin alone.
"""

from __future__ import annotations

ROLE_USER = "user"
ROLE_DEVELOPER = "developer"
ROLE_ADMIN = "admin"

STAFF_ROLES = frozenset({ROLE_ADMIN, ROLE_DEVELOPER})
ALL_ROLES = frozenset({ROLE_USER, ROLE_DEVELOPER, ROLE_ADMIN})


def normalize_role(value: str | None) -> str:
    role = (value or ROLE_USER).strip().lower()
    return role if role in ALL_ROLES else ROLE_USER


def is_staff(role: str | None) -> bool:
    return normalize_role(role) in STAFF_ROLES


def role_for_email(email: str | None, *, admin_emails: set[str], developer_emails: set[str]) -> str | None:
    """Return an elevated role from allowlists, or None if the email is not listed."""
    if not email:
        return None
    normalized = email.strip().lower()
    if normalized in admin_emails:
        return ROLE_ADMIN
    if normalized in developer_emails:
        return ROLE_DEVELOPER
    return None
