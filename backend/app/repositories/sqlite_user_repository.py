import sqlite3
from datetime import datetime
from pathlib import Path

from app.domain.user import Identity, User
from app.repositories.user_repository import UserRepository


class SqliteUserRepository(UserRepository):
    def __init__(self, file_path: str) -> None:
        self._path = Path(file_path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT,
                    name TEXT,
                    avatar_url TEXT,
                    created_at TEXT NOT NULL,
                    last_login_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS identities (
                    provider TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    email TEXT,
                    PRIMARY KEY (provider, subject),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                """
            )

    def get(self, user_id: str) -> User | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return self._user_from_row(row) if row else None

    def find_by_email(self, email: str) -> User | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1",
                (email,),
            ).fetchone()
        return self._user_from_row(row) if row else None

    def find_identity(self, provider: str, subject: str) -> Identity | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT provider, subject, user_id, email FROM identities WHERE provider = ? AND subject = ?",
                (provider, subject),
            ).fetchone()
        if row is None:
            return None
        return Identity(
            provider=row["provider"],
            subject=row["subject"],
            user_id=row["user_id"],
            email=row["email"],
        )

    def create(self, user: User, identity: Identity) -> User:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO users (id, email, name, avatar_url, created_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user.id,
                    user.email,
                    user.name,
                    user.avatar_url,
                    user.created_at.isoformat(),
                    user.last_login_at.isoformat(),
                ),
            )
            connection.execute(
                """
                INSERT INTO identities (provider, subject, user_id, email)
                VALUES (?, ?, ?, ?)
                """,
                (identity.provider, identity.subject, identity.user_id, identity.email),
            )
        return user

    def add_identity(self, identity: Identity) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO identities (provider, subject, user_id, email)
                VALUES (?, ?, ?, ?)
                """,
                (identity.provider, identity.subject, identity.user_id, identity.email),
            )

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
        current = self.get(user_id)
        if current is None:
            raise LookupError(f"Unknown user {user_id}")
        next_email = email or current.email
        next_name = name or current.name
        next_avatar = avatar_url or current.avatar_url
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE users
                SET email = ?, name = ?, avatar_url = ?, last_login_at = ?
                WHERE id = ?
                """,
                (next_email, next_name, next_avatar, last_login_at.isoformat(), user_id),
            )
        updated = self.get(user_id)
        if updated is None:
            raise LookupError(f"Unknown user {user_id}")
        if role is not None:
            return User(
                id=updated.id,
                email=updated.email,
                name=updated.name,
                avatar_url=updated.avatar_url,
                created_at=updated.created_at,
                last_login_at=updated.last_login_at,
                email_verified=updated.email_verified,
                has_password=updated.has_password,
                role=role,
            )
        return updated

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    @staticmethod
    def _user_from_row(row: sqlite3.Row) -> User:
        return User(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            avatar_url=row["avatar_url"],
            created_at=datetime.fromisoformat(row["created_at"]),
            last_login_at=datetime.fromisoformat(row["last_login_at"]),
        )
