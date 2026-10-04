from dataclasses import dataclass


@dataclass(frozen=True)
class RegisterResult:
    email: str
    message: str
    confirm_url: str | None
