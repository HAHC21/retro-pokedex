from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.domain.roles import ROLE_USER, normalize_role
from app.domain.user import User


class ProviderStatus(BaseModel):
    enabled: bool
    login_url: str | None = None


class AuthProvidersRead(BaseModel):
    google: ProviderStatus
    microsoft: ProviderStatus
    password: bool = True


class UserRead(BaseModel):
    id: str
    email: str | None
    name: str | None
    avatar_url: str | None
    email_verified: bool
    role: str = ROLE_USER
    created_at: datetime
    last_login_at: datetime

    @classmethod
    def from_domain(cls, user: User) -> "UserRead":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            email_verified=user.email_verified,
            role=normalize_role(user.role),
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str | None = Field(default=None, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ResendConfirmationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=8, max_length=256)
    password: str = Field(min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    ok: bool = True
    email: str
    message: str
    confirm_url: str | None = None
