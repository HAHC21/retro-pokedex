from datetime import datetime, timezone

from app.db.user.email_confirmation_document import EmailConfirmationDocument
from app.db.user.identity_document import IdentityDocument
from app.db.user.password_reset_document import PasswordResetDocument
from app.db.user.user_document import UserDocument
from app.domain.roles import ROLE_USER, normalize_role
from app.domain.user import Identity, User
from app.repositories.user import UserRepository


class MongoUserRepository(UserRepository):
    def get(self, user_id: str) -> User | None:
        doc = UserDocument.objects(user_id=user_id).first()
        return self._to_user(doc) if doc else None

    def find_by_email(self, email: str) -> User | None:
        doc = UserDocument.objects(email__iexact=email).first()
        return self._to_user(doc) if doc else None

    def find_identity(self, provider: str, subject: str) -> Identity | None:
        doc = IdentityDocument.objects(provider=provider, subject=subject).first()
        if doc is None:
            return None
        return Identity(
            provider=doc.provider,
            subject=doc.subject,
            user_id=doc.user_id,
            email=doc.email,
        )

    def create(
        self,
        user: User,
        identity: Identity,
        *,
        password_hash: str | None = None,
        email_verified_at: datetime | None = None,
    ) -> User:
        UserDocument(
            user_id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            password_hash=password_hash,
            email_verified_at=email_verified_at,
            role=normalize_role(user.role),
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        ).save()
        IdentityDocument(
            provider=identity.provider,
            subject=identity.subject,
            user_id=identity.user_id,
            email=identity.email,
        ).save()
        return self.get(user.id) or user

    def add_identity(self, identity: Identity) -> None:
        IdentityDocument(
            provider=identity.provider,
            subject=identity.subject,
            user_id=identity.user_id,
            email=identity.email,
        ).save()

    def update_profile(
        self,
        user_id: str,
        *,
        email: str | None,
        name: str | None,
        avatar_url: str | None,
        last_login_at: datetime,
        role: str | None = None,
    ) -> User:
        doc = UserDocument.objects(user_id=user_id).first()
        if doc is None:
            raise LookupError(f"Unknown user {user_id}")
        if email:
            doc.email = email
        if name:
            doc.name = name
        if avatar_url:
            doc.avatar_url = avatar_url
        if role is not None:
            doc.role = normalize_role(role)
        doc.last_login_at = last_login_at
        doc.save()
        return self._to_user(doc)

    def get_password_hash(self, user_id: str) -> str | None:
        doc = UserDocument.objects(user_id=user_id).first()
        return doc.password_hash if doc else None

    def set_password_hash(self, user_id: str, password_hash: str) -> None:
        doc = UserDocument.objects(user_id=user_id).first()
        if doc is None:
            raise LookupError(f"Unknown user {user_id}")
        doc.password_hash = password_hash
        doc.save()

    def delete_user(self, user_id: str) -> None:
        self.clear_email_confirmations(user_id)
        PasswordResetDocument.objects(user_id=user_id).delete()
        IdentityDocument.objects(user_id=user_id).delete()
        UserDocument.objects(user_id=user_id).delete()

    def mark_email_verified(self, user_id: str, when: datetime) -> User:
        doc = UserDocument.objects(user_id=user_id).first()
        if doc is None:
            raise LookupError(f"Unknown user {user_id}")
        doc.email_verified_at = when
        doc.last_login_at = when
        doc.save()
        self.clear_email_confirmations(user_id)
        return self._to_user(doc)

    def save_email_confirmation(self, token_hash: str, user_id: str, expires_at: datetime) -> None:
        self.clear_email_confirmations(user_id)
        EmailConfirmationDocument(token_hash=token_hash, user_id=user_id, expires_at=expires_at).save()

    def consume_email_confirmation(self, token_hash: str, now: datetime) -> str | None:
        doc = EmailConfirmationDocument.objects(token_hash=token_hash).first()
        if doc is None:
            return None
        expires = doc.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        compare_now = now if now.tzinfo else now.replace(tzinfo=timezone.utc)
        if expires < compare_now:
            doc.delete()
            return None
        user_id = doc.user_id
        doc.delete()
        return user_id

    def clear_email_confirmations(self, user_id: str) -> None:
        EmailConfirmationDocument.objects(user_id=user_id).delete()

    def save_password_reset(self, token_hash: str, user_id: str, expires_at: datetime) -> None:
        PasswordResetDocument.objects(user_id=user_id).delete()
        PasswordResetDocument(token_hash=token_hash, user_id=user_id, expires_at=expires_at).save()

    def consume_password_reset(self, token_hash: str, now: datetime) -> str | None:
        doc = PasswordResetDocument.objects(token_hash=token_hash).first()
        if doc is None:
            return None
        expires = doc.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        compare_now = now if now.tzinfo else now.replace(tzinfo=timezone.utc)
        if expires < compare_now:
            doc.delete()
            return None
        user_id = doc.user_id
        doc.delete()
        return user_id

    @staticmethod
    def _to_user(doc: UserDocument) -> User:
        has_password = bool(doc.password_hash)
        # Password accounts need an explicit verification timestamp.
        # OAuth / legacy rows without a password are treated as verified.
        email_verified = (doc.email_verified_at is not None) if has_password else True
        role = getattr(doc, "role", None) or ROLE_USER
        return User(
            id=doc.user_id,
            email=doc.email,
            name=doc.name,
            avatar_url=doc.avatar_url,
            created_at=doc.created_at,
            last_login_at=doc.last_login_at,
            email_verified=email_verified,
            has_password=has_password,
            role=normalize_role(role),
        )
