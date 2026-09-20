import logging
from typing import Protocol

import httpx

from app.core.config import settings

logger = logging.getLogger("pokedex.email")


class EmailSender(Protocol):
    async def send(self, *, to: str, subject: str, text: str) -> None: ...


class ConsoleEmailSender:
    """Zero-cost delivery: write the message to the server log."""

    async def send(self, *, to: str, subject: str, text: str) -> None:
        logger.info("EMAIL to=%s subject=%s\n%s", to, subject, text)


class ResendEmailSender:
    """Optional free-tier delivery via Resend (https://resend.com)."""

    def __init__(self, api_key: str, from_address: str) -> None:
        self._api_key = api_key
        self._from = from_address

    async def send(self, *, to: str, subject: str, text: str) -> None:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={
                    "from": self._from,
                    "to": [to],
                    "subject": subject,
                    "text": text,
                },
            )
            response.raise_for_status()


def build_email_sender() -> EmailSender:
    if settings.email_delivery == "resend" and settings.resend_api_key.strip():
        return ResendEmailSender(settings.resend_api_key.strip(), settings.email_from)
    return ConsoleEmailSender()
