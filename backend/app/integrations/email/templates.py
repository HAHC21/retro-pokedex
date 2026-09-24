"""HTML email templates shipped with the API."""

from __future__ import annotations
from functools import lru_cache
from pathlib import Path

_TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"

_PLAIN_TEXT = {
    "confirm-account": (
        "Welcome to Retro Pokédex.\n\n"
        "Confirm your email by opening this link:\n{url}\n\n"
        "This link expires in 48 hours. If you did not create an account, ignore this message.\n"
    ),
    "reset-password": (
        "Reset your Retro Pokédex password by opening this link:\n{url}\n\n"
        "This link expires in 48 hours. If you did not request a reset, ignore this message.\n"
    ),
}


@lru_cache(maxsize=8)
def _raw_template(name: str) -> str:
    path = _TEMPLATE_DIR / f"{name}.html"
    return path.read_text(encoding="utf-8")


def render_email(template_name: str, *, action_url: str) -> tuple[str, str]:
    """Return HTML and plain-text bodies with the action link filled in."""
    html = _raw_template(template_name).replace("{{action_url}}", action_url)
    text = _PLAIN_TEXT[template_name].format(url=action_url)
    return html, text
