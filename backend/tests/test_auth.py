"""Account creation and sign-in. Expected sentences come from the player contract."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.db.user.email_confirmation_document import EmailConfirmationDocument
from app.db.user.password_reset_document import PasswordResetDocument
from app.integrations.oidc.claims import OidcClaims
from app.services.auth.const import CONFIRMATION_TTL
from tests.support import PASSWORD, confirm, login, register, sign_in, token_from_url


def test_short_password_creates_no_account(world):
    """UC-ACC-02. Fewer than 8 characters is rejected and no account exists."""
    client = world.client
    rejected = register(client, "short@example.com", password="short")
    assert rejected.status_code == 422
    assert "8" in rejected.text

    unknown = login(client, "short@example.com", password="short")
    missing = login(client, "nobody@example.com", password=PASSWORD)
    assert unknown.status_code == 401
    assert missing.status_code == 401
    assert unknown.json()["detail"] == missing.json()["detail"]
    assert unknown.json()["detail"] == "Email or password is incorrect."


def test_unconfirmed_account_cannot_sign_in_and_retry_replaces_the_password(world):
    """UC-ACC-03 and UC-ACC-04. The new password replaces the old one. The old link is the one that was reissued."""
    client = world.client
    first = register(client, "ash@example.com", password="first-password")
    assert first.status_code == 200, first.text
    first_url = first.json()["confirm_url"]

    blocked = login(client, "ash@example.com", password="first-password")
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "Confirm your email before logging in."

    second = register(client, "ash@example.com", password="second-password")
    assert second.status_code == 200, second.text
    assert token_from_url(second.json()["confirm_url"]) != token_from_url(first_url)
    assert client.get("/api/auth/me").status_code == 401

    confirmed = confirm(client, second.json()["confirm_url"])
    assert confirmed.status_code == 302
    assert "signed_in=1" in confirmed.headers["location"]

    old_password = login(client, "ash@example.com", password="first-password")
    assert old_password.status_code == 401
    new_password = login(client, "ash@example.com", password="second-password")
    assert new_password.status_code == 200


def test_confirmation_link_lasts_48_hours_and_an_expired_link_does_not_sign_in(world):
    """UC-ACC-05. A link older than 48 hours does not confirm the account."""
    client = world.client
    created = register(client, "link@example.com")
    assert created.status_code == 200, created.text
    url = created.json()["confirm_url"]

    stored = EmailConfirmationDocument.objects.first()
    assert stored is not None
    expires = stored.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    remaining = expires - datetime.now(timezone.utc)
    assert CONFIRMATION_TTL - timedelta(minutes=5) < remaining <= CONFIRMATION_TTL

    stored.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    stored.save()
    expired = confirm(client, url)
    assert expired.status_code == 302
    assert "confirm_failed" in expired.headers["location"]
    still_blocked = login(client, "link@example.com")
    assert still_blocked.status_code == 403


def test_confirmed_email_cannot_be_registered_again(world):
    """UC-ACC-06. A second registration does not replace the confirmed password."""
    client = world.client
    sign_in(client, "taken@example.com", password="original-password")
    client.post("/api/auth/logout")

    again = register(client, "taken@example.com", password="other-password")
    assert again.status_code == 400
    assert "already exists" in again.json()["detail"].lower()

    original = login(client, "taken@example.com", password="original-password")
    assert original.status_code == 200
    other = login(client, "taken@example.com", password="other-password")
    assert other.status_code == 401


def test_mail_on_hides_the_link_and_still_sends_it(world, monkeypatch):
    """UC-ACC-01. With outbound mail, the response does not contain the link. The message does."""
    monkeypatch.setattr("app.services.auth.service.uses_outbound_email", lambda: False)
    hidden_check = register(world.client, "console@example.com")
    assert hidden_check.status_code == 200
    assert hidden_check.json()["confirm_url"]

    world.mailer.sent.clear()
    monkeypatch.setattr("app.services.auth.service.uses_outbound_email", lambda: True)
    created = register(world.client, "mailed@example.com")
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["confirm_url"] is None
    assert "http" not in body["message"]
    assert world.mailer.sent
    message = world.mailer.sent[-1]
    assert message["to"] == "mailed@example.com"
    assert "token=" in message["text"]


def test_wrong_password_matches_unknown_email(world):
    """UC-LOG-01. The two failures are the same sentence and neither starts a session."""
    client = world.client
    sign_in(client, "ash@example.com")
    client.post("/api/auth/logout")

    wrong = login(client, "ash@example.com", password="not-the-password")
    unknown = login(client, "missing@example.com", password="not-the-password")
    assert wrong.status_code == 401
    assert unknown.status_code == 401
    assert wrong.json()["detail"] == unknown.json()["detail"] == "Email or password is incorrect."
    me = client.get("/api/auth/me")
    assert me.status_code == 401


def test_forgot_password_is_the_same_sentence_and_mail_goes_only_to_a_confirmed_password_account(world):
    """UC-LOG-06 and UC-LOG-08. Unknown, unconfirmed, and provider accounts send nothing."""
    client = world.client
    sign_in(client, "ash@example.com")
    client.post("/api/auth/logout")
    register(client, "pending@example.com")

    from app.dependencies import get_auth_service

    service = get_auth_service()
    service.authenticate(
        OidcClaims(
            provider="google",
            subject="google-oak",
            email="oak@example.com",
            email_verified=True,
            name="Professor Oak",
            avatar_url=None,
        )
    )

    world.mailer.sent.clear()
    sentences = []
    for email in ("ash@example.com", "nobody@example.com", "pending@example.com", "oak@example.com"):
        response = client.post("/api/auth/forgot-password", json={"email": email})
        assert response.status_code == 200, response.text
        sentences.append(response.json()["message"])
        assert response.json()["confirm_url"] is None or email == "ash@example.com"

    assert len(set(sentences)) == 1
    assert sentences[0] == "If that account exists, a password reset link was sent."
    reset_mail = [item for item in world.mailer.sent if "reset" in item["subject"].lower()]
    assert len(reset_mail) == 1
    assert reset_mail[0]["to"] == "ash@example.com"
    assert "/login?reset_token=" in reset_mail[0]["text"]
    assert "/api/" not in reset_mail[0]["text"]


def test_reset_link_replaces_the_password_and_a_short_or_spent_link_does_not(world):
    """UC-LOG-09. A short password leaves the old one. A used link cannot be used again."""
    client = world.client
    sign_in(client, "ash@example.com", password="original-password")
    client.post("/api/auth/logout")
    world.mailer.sent.clear()

    asked = client.post("/api/auth/forgot-password", json={"email": "ash@example.com"})
    assert asked.status_code == 200
    url = asked.json()["confirm_url"]
    assert url and "/login?reset_token=" in url
    token = token_from_url(url)

    too_short = client.post("/api/auth/reset-password", json={"token": token, "password": "short"})
    assert too_short.status_code == 422
    assert "8" in too_short.text
    assert client.get("/api/auth/me").status_code == 401
    assert login(client, "ash@example.com", password="original-password").status_code == 200
    client.post("/api/auth/logout")

    stored = PasswordResetDocument.objects.first()
    assert stored is not None
    stored.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    stored.save()
    expired = client.post("/api/auth/reset-password", json={"token": token, "password": "brand-new-password"})
    assert expired.status_code == 400
    assert "invalid or expired" in expired.json()["detail"].lower()
    assert login(client, "ash@example.com", password="original-password").status_code == 200
    client.post("/api/auth/logout")

    asked_again = client.post("/api/auth/forgot-password", json={"email": "ash@example.com"})
    fresh = token_from_url(asked_again.json()["confirm_url"])
    saved = client.post("/api/auth/reset-password", json={"token": fresh, "password": "brand-new-password"})
    assert saved.status_code == 200, saved.text
    assert client.get("/api/auth/me").status_code == 200
    client.post("/api/auth/logout")
    spent = client.post("/api/auth/reset-password", json={"token": fresh, "password": "yet-another-password"})
    assert spent.status_code == 400
    assert login(client, "ash@example.com", password="original-password").status_code == 401
    assert login(client, "ash@example.com", password="brand-new-password").status_code == 200


def test_logout_ends_the_session_only(world):
    """UC-X-12. The account is still there. This browser is signed out."""
    client = world.client
    sign_in(client, "ash@example.com")
    goodbye = client.post("/api/auth/logout")
    assert goodbye.status_code == 200
    assert client.get("/api/auth/me").status_code == 401
    assert login(client, "ash@example.com").status_code == 200


def test_provider_sign_in_reuses_the_same_account_and_a_provider_error_starts_no_session(world):
    """UC-ACC-07 and UC-LOG-03. The second visit is the same trainer. A provider error is not a session."""
    from app.dependencies import get_auth_service

    service = get_auth_service()
    claims = OidcClaims(
        provider="google",
        subject="google-ash",
        email="ash@example.com",
        email_verified=True,
        name="Ash",
        avatar_url=None,
    )
    first = service.authenticate(claims)
    second = service.authenticate(claims)
    assert first.id == second.id
    assert second.email == "ash@example.com"

    client = world.client
    failed = client.get("/api/auth/google/callback", params={"error": "access_denied"}, follow_redirects=False)
    assert failed.status_code == 302
    assert "auth_error=access_denied" in failed.headers["location"]
    assert client.get("/api/auth/me").status_code == 401
