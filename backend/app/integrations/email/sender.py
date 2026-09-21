import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Protocol

import httpx

from app.core.config import settings

logger = logging.getLogger("pokedex.email")


class EmailSendError(RuntimeError):
    """Raised when outbound email delivery fails."""


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


class SmtpEmailSender:
    """SMTP delivery (MailerSend, SES, etc.) over STARTTLS."""

    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str,
        password: str,
        from_address: str,
        use_tls: bool = True,
    ) -> None:
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._from = from_address
        self._use_tls = use_tls

    async def send(self, *, to: str, subject: str, text: str) -> None:
        message = EmailMessage()
        message["From"] = self._from
        message["To"] = to
        message["Subject"] = subject
        message.set_content(text)
        try:
            await asyncio.to_thread(self._send_sync, message)
        except smtplib.SMTPAuthenticationError as exc:
            logger.exception("SMTP authentication failed for %s", self._username)
            raise EmailSendError(
                "Email service rejected the SMTP credentials. "
                "Reset the MailerSend SMTP password and update SMTP_PASSWORD in backend/.env."
            ) from exc
        except smtplib.SMTPException as exc:
            logger.exception("SMTP send failed")
            raise EmailSendError("Could not send confirmation email. Try again shortly.") from exc

    def _send_sync(self, message: EmailMessage) -> None:
        context = ssl.create_default_context()
        with smtplib.SMTP(self._host, self._port, timeout=30) as client:
            client.ehlo()
            if self._use_tls:
                client.starttls(context=context)
                client.ehlo()
            client.login(self._username, self._password)
            client.send_message(message)


def uses_outbound_email() -> bool:
    delivery = settings.email_delivery.strip().lower()
    if delivery == "resend" and settings.resend_api_key.strip():
        return True
    if delivery in {"smtp", "mailersend"} and settings.smtp_host.strip() and settings.smtp_username.strip():
        return bool(settings.smtp_password.strip())
    return False


def build_email_sender() -> EmailSender:
    delivery = settings.email_delivery.strip().lower()
    if delivery == "resend" and settings.resend_api_key.strip():
        return ResendEmailSender(settings.resend_api_key.strip(), settings.email_from)
    if delivery in {"smtp", "mailersend"} and settings.smtp_host.strip() and settings.smtp_username.strip():
        if not settings.smtp_password.strip():
            logger.warning("SMTP delivery selected but SMTP_PASSWORD is empty; falling back to console.")
            return ConsoleEmailSender()
        return SmtpEmailSender(
            host=settings.smtp_host.strip(),
            port=settings.smtp_port,
            username=settings.smtp_username.strip(),
            password=settings.smtp_password.strip(),
            from_address=settings.email_from.strip(),
            use_tls=settings.smtp_use_tls,
        )
    return ConsoleEmailSender()
