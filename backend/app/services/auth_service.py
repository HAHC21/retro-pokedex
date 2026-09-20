from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.core.config import settings
from app.core.security import hash_password, hash_token, new_confirmation_token, verify_password
from app.domain.user import Identity, User
from app.integrations.email.sender import EmailSender
from app.integrations.oidc.claims import OidcClaims
from app.repositories.user_repository import UserRepository

PASSWORD_PROVIDER = "password"
MIN_PASSWORD_LENGTH = 8
CONFIRMATION_TTL = timedelta(hours=48)


class AuthError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class RegisterResult:
    email: str
    message: str
    confirm_url: str | None


class AuthService:
    def __init__(self, users: UserRepository, mailer: EmailSender) -> None:
        self._users = users
        self._mailer = mailer

    def authenticate(self, claims: OidcClaims) -> User:
        now = datetime.now(timezone.utc)
        identity = self._users.find_identity(claims.provider, claims.subject)
        if identity is not None:
            return self._users.update_profile(
                identity.user_id,
                email=claims.email,
                name=claims.name,
                avatar_url=claims.avatar_url,
                last_login_at=now,
            )

        linked = None
        if claims.email_verified and claims.email:
            linked = self._users.find_by_email(claims.email)

        if linked is not None:
            self._users.add_identity(
                Identity(
                    provider=claims.provider,
                    subject=claims.subject,
                    user_id=linked.id,
                    email=claims.email,
                )
            )
            return self._users.update_profile(
                linked.id,
                email=claims.email,
                name=claims.name,
                avatar_url=claims.avatar_url,
                last_login_at=now,
            )

        user_id = str(uuid4())
        user = User(
            id=user_id,
            email=claims.email,
            name=claims.name,
            avatar_url=claims.avatar_url,
            created_at=now,
            last_login_at=now,
            email_verified=True,
            has_password=False,
        )
        return self._users.create(
            user,
            Identity(
                provider=claims.provider,
                subject=claims.subject,
                user_id=user_id,
                email=claims.email,
            ),
            email_verified_at=now,
        )

    async def register(self, email: str, password: str, name: str | None) -> RegisterResult:
        normalized = email.strip().lower()
        if not normalized:
            raise AuthError("invalid_email", "Email is required.")
        if len(password) < MIN_PASSWORD_LENGTH:
            raise AuthError("weak_password", f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        if self._users.find_by_email(normalized) is not None:
            raise AuthError("email_taken", "An account with that email already exists.")

        now = datetime.now(timezone.utc)
        user_id = str(uuid4())
        user = User(
            id=user_id,
            email=normalized,
            name=(name or "").strip() or normalized.split("@")[0],
            avatar_url=None,
            created_at=now,
            last_login_at=now,
            email_verified=False,
            has_password=True,
        )
        self._users.create(
            user,
            Identity(
                provider=PASSWORD_PROVIDER,
                subject=normalized,
                user_id=user_id,
                email=normalized,
            ),
            password_hash=hash_password(password),
            email_verified_at=None,
        )
        confirm_url = await self._issue_confirmation(user_id, normalized)
        message = (
            "Check your email for a confirmation link."
            if settings.email_delivery == "resend" and settings.resend_api_key.strip()
            else "Confirm your email using the link below (also printed in the API server log)."
        )
        expose_link = settings.email_delivery != "resend" or not settings.resend_api_key.strip()
        return RegisterResult(
            email=normalized,
            message=message,
            confirm_url=confirm_url if expose_link else None,
        )

    def login(self, email: str, password: str) -> User:
        normalized = email.strip().lower()
        user = self._users.find_by_email(normalized)
        if user is None or not user.has_password:
            raise AuthError("invalid_credentials", "Email or password is incorrect.")
        password_hash = self._users.get_password_hash(user.id)
        if not password_hash or not verify_password(password, password_hash):
            raise AuthError("invalid_credentials", "Email or password is incorrect.")
        if not user.email_verified:
            raise AuthError("email_unverified", "Confirm your email before logging in.")
        now = datetime.now(timezone.utc)
        return self._users.update_profile(
            user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            last_login_at=now,
        )

    def confirm_email(self, token: str) -> User:
        now = datetime.now(timezone.utc)
        user_id = self._users.consume_email_confirmation(hash_token(token), now)
        if not user_id:
            raise AuthError("invalid_token", "This confirmation link is invalid or expired.")
        return self._users.mark_email_verified(user_id, now)

    async def resend_confirmation(self, email: str) -> RegisterResult:
        normalized = email.strip().lower()
        user = self._users.find_by_email(normalized)
        if user is None or not user.has_password:
            # Avoid account enumeration.
            return RegisterResult(
                email=normalized,
                message="If that account exists and is unverified, a new link was issued.",
                confirm_url=None,
            )
        if user.email_verified:
            return RegisterResult(
                email=normalized,
                message="That email is already confirmed. You can log in.",
                confirm_url=None,
            )
        confirm_url = await self._issue_confirmation(user.id, normalized)
        expose_link = settings.email_delivery != "resend" or not settings.resend_api_key.strip()
        return RegisterResult(
            email=normalized,
            message="A new confirmation link was issued.",
            confirm_url=confirm_url if expose_link else None,
        )

    def get_user(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    async def _issue_confirmation(self, user_id: str, email: str) -> str:
        token = new_confirmation_token()
        expires = datetime.now(timezone.utc) + CONFIRMATION_TTL
        self._users.save_email_confirmation(hash_token(token), user_id, expires)
        confirm_url = (
            f"{settings.auth_redirect_base_url.rstrip('/')}{settings.api_prefix}/auth/confirm"
            f"?token={token}"
        )
        await self._mailer.send(
            to=email,
            subject="Confirm your Pokédex account",
            text=(
                "Welcome to Pokédex Collection.\n\n"
                f"Confirm your email by opening this link:\n{confirm_url}\n\n"
                "This link expires in 48 hours. If you did not create an account, ignore this message.\n"
            ),
        )
        return confirm_url
