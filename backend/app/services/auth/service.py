from datetime import datetime, timezone
from uuid import uuid4

from app.core.config import settings
from app.core.security import hash_password, hash_token, new_confirmation_token, verify_password
from app.domain.roles import ROLE_USER, is_staff, normalize_role, role_for_email
from app.domain.user import Identity, User
from app.errors import AuthError
from app.integrations.email.sender import EmailSender, uses_outbound_email
from app.integrations.email.templates import render_email
from app.integrations.oidc.claims import OidcClaims
from app.repositories.login_event import LoginEventRepository
from app.repositories.user import UserRepository
from app.services.auth.const import CONFIRMATION_TTL, MIN_PASSWORD_LENGTH, PASSWORD_PROVIDER, ROLE_RANK
from app.services.auth.helpers import parse_email_list
from app.services.auth.models import RegisterResult


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        mailer: EmailSender,
        login_events: LoginEventRepository | None = None,
    ) -> None:
        self._users = users
        self._mailer = mailer
        self._login_events = login_events

    def _record_login(self, user: User, method: str, when: datetime) -> User:
        if self._login_events is not None:
            self._login_events.record(
                user_id=user.id,
                email=user.email,
                method=method,
                occurred_at=when,
            )
        return user

    def _elevated_role_for(self, email: str | None) -> str | None:
        return role_for_email(
            email,
            admin_emails=parse_email_list(settings.admin_emails),
            developer_emails=parse_email_list(settings.developer_emails),
        )

    def _role_for_new_user(self, email: str | None) -> str:
        return self._elevated_role_for(email) or ROLE_USER

    def _resolved_role(self, user: User) -> str:
        current = normalize_role(user.role)
        elevated = self._elevated_role_for(user.email)
        if elevated is None:
            return current
        if ROLE_RANK.get(elevated, 0) >= ROLE_RANK.get(current, 0):
            return elevated
        return current

    def _sync_allowlist_role(self, user: User, *, last_login_at: datetime | None = None) -> User:
        """Elevate from env allowlists without demoting an already-elevated account."""
        next_role = self._resolved_role(user)
        current = normalize_role(user.role)
        if next_role == current and last_login_at is None:
            return user
        return self._users.update_profile(
            user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            last_login_at=last_login_at or user.last_login_at,
            role=next_role if next_role != current else None,
        )

    def _apply_role_elevation(self, user: User, *, last_login_at: datetime) -> User:
        return self._sync_allowlist_role(user, last_login_at=last_login_at)

    def authenticate(self, claims: OidcClaims) -> User:
        now = datetime.now(timezone.utc)
        identity = self._users.find_identity(claims.provider, claims.subject)
        if identity is not None:
            user = self._users.update_profile(
                identity.user_id,
                email=claims.email,
                name=claims.name,
                avatar_url=claims.avatar_url,
                last_login_at=now,
            )
            user = self._apply_role_elevation(user, last_login_at=now)
            return self._record_login(user, claims.provider, now)

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
            user = self._users.update_profile(
                linked.id,
                email=claims.email,
                name=claims.name,
                avatar_url=claims.avatar_url,
                last_login_at=now,
            )
            user = self._apply_role_elevation(user, last_login_at=now)
            return self._record_login(user, claims.provider, now)

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
            role=self._role_for_new_user(claims.email),
        )
        created = self._users.create(
            user,
            Identity(
                provider=claims.provider,
                subject=claims.subject,
                user_id=user_id,
                email=claims.email,
            ),
            email_verified_at=now,
        )
        return self._record_login(created, claims.provider, now)

    async def register(
        self,
        email: str,
        password: str,
        name: str | None,
        *,
        public_api_base: str,
    ) -> RegisterResult:
        normalized = email.strip().lower()
        if not normalized:
            raise AuthError("invalid_email", "Email is required.")
        if len(password) < MIN_PASSWORD_LENGTH:
            raise AuthError("weak_password", f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

        existing = self._users.find_by_email(normalized)
        if existing is not None:
            if existing.has_password and not existing.email_verified:
                # Earlier attempt created the row (e.g. SMTP failed after insert). Let them retry.
                self._users.set_password_hash(existing.id, hash_password(password))
                if name and name.strip():
                    self._users.update_profile(
                        existing.id,
                        email=existing.email,
                        name=name.strip(),
                        avatar_url=existing.avatar_url,
                        last_login_at=existing.last_login_at,
                    )
                confirm_url = await self._issue_confirmation(
                    existing.id, normalized, public_api_base=public_api_base
                )
                return self._register_result(normalized, confirm_url)
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
            role=self._role_for_new_user(normalized),
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
        try:
            confirm_url = await self._issue_confirmation(
                user_id, normalized, public_api_base=public_api_base
            )
        except Exception:
            # Don't leave an account that can't confirm when outbound mail fails.
            self._users.delete_user(user_id)
            raise
        return self._register_result(normalized, confirm_url)

    def _register_result(self, email: str, confirm_url: str) -> RegisterResult:
        if uses_outbound_email():
            message = "Check your email for a confirmation link."
            expose_link = False
        else:
            message = "Confirm your email using the link below (also printed in the API server log)."
            expose_link = True
        return RegisterResult(
            email=email,
            message=message,
            confirm_url=confirm_url if expose_link else None,
        )

    def _verified_password_user(self, email: str, password: str) -> User:
        normalized = email.strip().lower()
        user = self._users.find_by_email(normalized)
        if user is None or not user.has_password:
            raise AuthError("invalid_credentials", "Email or password is incorrect.")
        password_hash = self._users.get_password_hash(user.id)
        if not password_hash or not verify_password(password, password_hash):
            raise AuthError("invalid_credentials", "Email or password is incorrect.")
        if not user.email_verified:
            raise AuthError("email_unverified", "Confirm your email before logging in.")
        return user

    def login(self, email: str, password: str) -> User:
        user = self._verified_password_user(email, password)
        now = datetime.now(timezone.utc)
        signed_in = self._apply_role_elevation(user, last_login_at=now)
        return self._record_login(signed_in, PASSWORD_PROVIDER, now)

    def login_staff(self, email: str, password: str) -> User:
        """Dashboard entry. Does not write a website login event or last_login_at."""
        user = self._verified_password_user(email, password)
        user = self._sync_allowlist_role(user)
        if not is_staff(user.role):
            raise AuthError("not_staff", "Only admins and developers can log in.")
        return user

    def confirm_email(self, token: str) -> User:
        now = datetime.now(timezone.utc)
        user_id = self._users.consume_email_confirmation(hash_token(token), now)
        if not user_id:
            raise AuthError("invalid_token", "This confirmation link is invalid or expired.")
        return self._users.mark_email_verified(user_id, now)

    async def resend_confirmation(self, email: str, *, public_api_base: str) -> RegisterResult:
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
        confirm_url = await self._issue_confirmation(
            user.id, normalized, public_api_base=public_api_base
        )
        expose_link = not uses_outbound_email()
        return RegisterResult(
            email=normalized,
            message="A new confirmation link was issued.",
            confirm_url=confirm_url if expose_link else None,
        )

    def get_user(self, user_id: str) -> User | None:
        user = self._users.get(user_id)
        if user is None:
            return None
        return self._sync_allowlist_role(user)

    async def request_password_reset(self, email: str, *, public_frontend_origin: str) -> RegisterResult:
        normalized = email.strip().lower()
        generic = RegisterResult(
            email=normalized,
            message="If that account exists, a password reset link was sent.",
            confirm_url=None,
        )
        user = self._users.find_by_email(normalized)
        if user is None or not user.has_password or not user.email_verified:
            return generic
        token = new_confirmation_token()
        expires = datetime.now(timezone.utc) + CONFIRMATION_TTL
        self._users.save_password_reset(hash_token(token), user.id, expires)
        reset_url = f"{public_frontend_origin.rstrip('/')}/login?reset_token={token}"
        html, text = render_email("reset-password", action_url=reset_url)
        await self._mailer.send(
            to=normalized,
            subject="Reset your Retro Pokédex password",
            text=text,
            html=html,
        )
        expose_link = not uses_outbound_email()
        return RegisterResult(
            email=normalized,
            message=generic.message,
            confirm_url=reset_url if expose_link else None,
        )

    def reset_password(self, token: str, password: str) -> User:
        if len(password) < MIN_PASSWORD_LENGTH:
            raise AuthError("weak_password", f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        now = datetime.now(timezone.utc)
        user_id = self._users.consume_password_reset(hash_token(token), now)
        if not user_id:
            raise AuthError("invalid_token", "This reset link is invalid or expired.")
        user = self._users.get(user_id)
        if user is None or not user.has_password:
            raise AuthError("invalid_token", "This reset link is invalid or expired.")
        self._users.set_password_hash(user_id, hash_password(password))
        return self._users.update_profile(
            user_id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            last_login_at=now,
        )

    async def _issue_confirmation(self, user_id: str, email: str, *, public_api_base: str) -> str:
        token = new_confirmation_token()
        expires = datetime.now(timezone.utc) + CONFIRMATION_TTL
        self._users.save_email_confirmation(hash_token(token), user_id, expires)
        confirm_url = (
            f"{public_api_base.rstrip('/')}{settings.api_prefix}/auth/confirm"
            f"?token={token}"
        )
        html, text = render_email("confirm-account", action_url=confirm_url)
        await self._mailer.send(
            to=email,
            subject="Confirm your Retro Pokédex account",
            text=text,
            html=html,
        )
        return confirm_url
