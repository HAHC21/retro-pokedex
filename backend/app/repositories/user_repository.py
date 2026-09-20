from abc import ABC, abstractmethod
from datetime import datetime

from app.domain.user import Identity, User


class UserRepository(ABC):
    @abstractmethod
    def get(self, user_id: str) -> User | None:
        raise NotImplementedError

    @abstractmethod
    def find_by_email(self, email: str) -> User | None:
        raise NotImplementedError

    @abstractmethod
    def find_identity(self, provider: str, subject: str) -> Identity | None:
        raise NotImplementedError

    @abstractmethod
    def create(
        self,
        user: User,
        identity: Identity,
        *,
        password_hash: str | None = None,
        email_verified_at: datetime | None = None,
    ) -> User:
        raise NotImplementedError

    @abstractmethod
    def add_identity(self, identity: Identity) -> None:
        raise NotImplementedError

    @abstractmethod
    def update_profile(
        self,
        user_id: str,
        *,
        email: str | None,
        name: str | None,
        avatar_url: str | None,
        last_login_at: datetime,
    ) -> User:
        raise NotImplementedError

    @abstractmethod
    def get_password_hash(self, user_id: str) -> str | None:
        raise NotImplementedError

    @abstractmethod
    def mark_email_verified(self, user_id: str, when: datetime) -> User:
        raise NotImplementedError

    @abstractmethod
    def save_email_confirmation(self, token_hash: str, user_id: str, expires_at: datetime) -> None:
        raise NotImplementedError

    @abstractmethod
    def consume_email_confirmation(self, token_hash: str, now: datetime) -> str | None:
        raise NotImplementedError

    @abstractmethod
    def clear_email_confirmations(self, user_id: str) -> None:
        raise NotImplementedError
