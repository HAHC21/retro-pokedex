"""Celery worker. The API process does not start this and does not talk to the broker."""

from celery import Celery

from app.core.config import settings

celery_app = Celery("pokedex", broker=settings.celery_broker_url)
celery_app.conf.beat_schedule = {
    "fill-data-gaps": {
        "task": "scripts.tasks.fill_data_gaps.fill_data_gaps",
        "schedule": float(settings.fill_gaps_interval_seconds),
    }
}
celery_app.conf.timezone = "UTC"

from scripts.tasks.fill_data_gaps import fill_data_gaps as fill_data_gaps  # noqa: E402,F401
