from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4

from app.db.admin_documents import LoginEventDocument
from app.db.user_documents import UserDocument


@dataclass(frozen=True)
class LoginEvent:
    event_id: str
    user_id: str
    email: str | None
    method: str
    occurred_at: datetime


class LoginEventRepository:
    def record(
        self,
        *,
        user_id: str,
        email: str | None,
        method: str,
        occurred_at: datetime,
    ) -> LoginEvent:
        event_id = str(uuid4())
        LoginEventDocument(
            event_id=event_id,
            user_id=user_id,
            email=email,
            method=method,
            occurred_at=occurred_at,
        ).save()
        return LoginEvent(
            event_id=event_id,
            user_id=user_id,
            email=email,
            method=method,
            occurred_at=occurred_at,
        )

    def count_since(self, since: datetime) -> int:
        return int(LoginEventDocument.objects(occurred_at__gte=since).count())

    def recent(self, limit: int = 20) -> list[LoginEvent]:
        docs = LoginEventDocument.objects.order_by("-occurred_at").limit(limit)
        return [
            LoginEvent(
                event_id=doc.event_id,
                user_id=doc.user_id,
                email=doc.email,
                method=doc.method,
                occurred_at=doc.occurred_at,
            )
            for doc in docs
        ]

    def user_count(self) -> int:
        return int(UserDocument.objects.count())
