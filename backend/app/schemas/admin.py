from datetime import datetime

from pydantic import BaseModel

from app.repositories.login_event import LoginEvent
from app.repositories.site_activity import ActivitySnapshot


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


class CountWindowRead(BaseModel):
    today: int
    last_7_days: int
    last_30_days: int


class ActivityDayRead(BaseModel):
    date: str
    users: int
    markings: int
    pk_uploads: int
    screenshots: int


class ActivityRead(BaseModel):
    users: CountWindowRead
    markings: CountWindowRead
    pk_uploads: CountWindowRead
    screenshots: CountWindowRead
    daily: list[ActivityDayRead]

    @classmethod
    def from_snapshot(cls, snapshot: ActivitySnapshot) -> "ActivityRead":
        return cls(
            users=CountWindowRead(
                today=snapshot.users.today,
                last_7_days=snapshot.users.last_7_days,
                last_30_days=snapshot.users.last_30_days,
            ),
            markings=CountWindowRead(
                today=snapshot.markings.today,
                last_7_days=snapshot.markings.last_7_days,
                last_30_days=snapshot.markings.last_30_days,
            ),
            pk_uploads=CountWindowRead(
                today=snapshot.pk_uploads.today,
                last_7_days=snapshot.pk_uploads.last_7_days,
                last_30_days=snapshot.pk_uploads.last_30_days,
            ),
            screenshots=CountWindowRead(
                today=snapshot.screenshots.today,
                last_7_days=snapshot.screenshots.last_7_days,
                last_30_days=snapshot.screenshots.last_30_days,
            ),
            daily=[
                ActivityDayRead(
                    date=day.date,
                    users=day.users,
                    markings=day.markings,
                    pk_uploads=day.pk_uploads,
                    screenshots=day.screenshots,
                )
                for day in snapshot.daily
            ],
        )


class RankedMetricRead(BaseModel):
    label: str
    clicks: int = 0
    impressions: int = 0
    sessions: int = 0
    pageviews: int = 0


class GoogleChannelRead(BaseModel):
    connected: bool
    error: str | None = None
    clicks: int = 0
    impressions: int = 0
    sessions: int = 0
    pageviews: int = 0
    users: int = 0
    search_terms: list[RankedMetricRead] = []
    countries: list[RankedMetricRead] = []


class GoogleInsightsRead(BaseModel):
    error: str | None = None
    account_email: str | None = None
    range_start: str
    range_end: str
    fetched_at: datetime | None = None
    analytics: GoogleChannelRead
    search_console: GoogleChannelRead
    ads: GoogleChannelRead


class AdminOverviewRead(BaseModel):
    user_count: int
    logins_today: int
    logins_last_7_days: int
    recent_logins: list[LoginEventRead]
    activity: ActivityRead
    google: GoogleInsightsRead
