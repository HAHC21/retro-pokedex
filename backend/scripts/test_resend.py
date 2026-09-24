"""Send one test message through Resend.

Usage (from backend/):

    python -m scripts.test_resend
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import resend

from app.core.config import settings


def main() -> None:
    api_key = settings.resend_api_key.strip()
    if not api_key:
        raise SystemExit("RESEND_API_KEY is empty in backend/.env")
    resend.api_key = api_key
    result = resend.Emails.send(
        {
            "from": "onboarding@resend.dev",
            "to": "hahc21@gmail.com",
            "subject": "Hello World",
            "html": "<p>Congrats on sending your <strong>first email</strong>!</p>",
        }
    )
    print(result)


if __name__ == "__main__":
    main()
