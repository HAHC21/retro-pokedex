from pathlib import Path

from app.core.config import settings

_VERSION_PATH = Path(__file__).resolve().parents[1] / "VERSION"


def _file_version() -> str:
    try:
        text = _VERSION_PATH.read_text(encoding="utf-8").strip()
    except OSError:
        return "dev"
    return text or "dev"


def _configured_version() -> str:
    for value in (settings.app_version, settings.commit_hash):
        text = value.strip()
        if text and not text.startswith("${"):
            return text
    return ""


def backend_version() -> str:
    """API release id. APP_VERSION or COMMIT_HASH overrides backend/app/VERSION."""
    return _configured_version() or _file_version()
