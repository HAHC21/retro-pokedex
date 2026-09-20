from dataclasses import dataclass
from typing import Any, Mapping


class IncompleteOidcClaimsError(ValueError):
    pass


@dataclass(frozen=True)
class OidcClaims:
    provider: str
    subject: str
    email: str | None
    email_verified: bool
    name: str | None
    avatar_url: str | None


def claims_from_token(provider: str, token: Mapping[str, Any]) -> OidcClaims:
    info = _mapping(token.get("userinfo"))
    subject = str(info.get("sub") or "")
    if not subject:
        raise IncompleteOidcClaimsError("Provider did not return a subject")
    email = _optional_str(info.get("email") or info.get("preferred_username"))
    if email and "@" not in email:
        email = None
    verified = info.get("email_verified")
    if verified is None:
        email_verified = provider == "microsoft" and email is not None
    else:
        email_verified = bool(verified)
    return OidcClaims(
        provider=provider,
        subject=subject,
        email=email,
        email_verified=email_verified,
        name=_optional_str(info.get("name")),
        avatar_url=_optional_str(info.get("picture")),
    )


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _optional_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed or None
