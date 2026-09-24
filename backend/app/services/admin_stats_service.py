from datetime import datetime, timedelta, timezone

from app.repositories.login_event_repository import LoginEventRepository
from app.schemas.admin import AdminOverviewRead, LoginEventRead


class AdminStatsService:
    def __init__(self, login_events: LoginEventRepository) -> None:
        self._login_events = login_events

    def overview(self, *, now: datetime | None = None) -> AdminOverviewRead:
        current = now or datetime.now(timezone.utc)
        start_of_today = current.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = current - timedelta(days=7)
        recent = self._login_events.recent(limit=20)
        return AdminOverviewRead(
            user_count=self._login_events.user_count(),
            logins_today=self._login_events.count_since(start_of_today),
            logins_last_7_days=self._login_events.count_since(week_ago),
            recent_logins=[LoginEventRead.from_event(event) for event in recent],
        )
