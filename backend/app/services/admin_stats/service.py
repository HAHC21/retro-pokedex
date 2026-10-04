from datetime import datetime, timedelta, timezone

from app.integrations.google.insights import GoogleInsightsClient
from app.repositories.login_event import LoginEventRepository
from app.repositories.site_activity import SiteActivityRepository
from app.schemas.admin import (
    ActivityRead,
    AdminOverviewRead,
    GoogleChannelRead,
    GoogleInsightsRead,
    LoginEventRead,
)


class AdminStatsService:
    def __init__(
        self,
        login_events: LoginEventRepository,
        activity: SiteActivityRepository,
        google: GoogleInsightsClient,
    ) -> None:
        self._login_events = login_events
        self._activity = activity
        self._google = google

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
            activity=ActivityRead.from_snapshot(self._activity.snapshot(current)),
            google=self._google_read(current),
        )

    def _google_read(self, now: datetime) -> GoogleInsightsRead:
        try:
            return GoogleInsightsRead.model_validate(self._google.snapshot(now))
        except Exception:
            end = (now.astimezone(timezone.utc) - timedelta(days=1)).date()
            start = end - timedelta(days=27)
            empty = GoogleChannelRead(connected=False)
            return GoogleInsightsRead(
                error="Could not read Google results.",
                range_start=start.isoformat(),
                range_end=end.isoformat(),
                analytics=empty,
                search_console=empty,
                ads=empty,
            )
