from datetime import datetime

from pydantic import BaseModel

from app.repositories.login_event_repository import LoginEvent


class LoginEventRead(BaseModel):
    event_id: str
    user_id: str
    email: str | None
    method: str
    occurred_at: datetime

    @classmethod
    def from_event(cls, event: LoginEvent) -> "LoginEventRead":
        return cls(
            event_id=event.event_id,
            user_id=event.user_id,
            email=event.email,
            method=event.method,
            occurred_at=event.occurred_at,
        )


class AdminOverviewRead(BaseModel):
    user_count: int
    logins_today: int
    logins_last_7_days: int
    recent_logins: list[LoginEventRead]
