from dataclasses import dataclass
from datetime import datetime

from app.domain.roles import ROLE_USER, normalize_role


@dataclass(frozen=True)
class User:
    id: str
    email: str | None
    name: str | None
    avatar_url: str | None
    created_at: datetime
    last_login_at: datetime
    email_verified: bool = True
    has_password: bool = False
    role: str = ROLE_USER

    @property
    def normalized_role(self) -> str:
        return normalize_role(self.role)


@dataclass(frozen=True)
class Identity:
    provider: str
    subject: str
    user_id: str
    email: str | None
