import asyncio

from app.celery_app import celery_app
from app.services.poke_compile.fill import fill_open_gaps


@celery_app.task(name="app.tasks.fill_data_gaps.fill_data_gaps")
def fill_data_gaps() -> dict:
    return asyncio.run(fill_open_gaps())
