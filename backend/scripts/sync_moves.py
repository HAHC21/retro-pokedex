"""Sync the PokéAPI move catalog into MongoDB `moves`.

Usage (from backend/ with venv active):

    python -m scripts.sync_moves
    python -m scripts.sync_moves --limit 50
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# Allow `python -m scripts.sync_moves` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.mongo import connect_mongo, disconnect_mongo
from app.dependencies import get_pokeapi_client, shutdown_external_clients
from app.repositories.move import MoveRepository


async def sync_moves(*, limit: int | None = None, delay_seconds: float = 0.05) -> int:
    client = get_pokeapi_client()
    repo = MoveRepository()
    listed = await client.list_moves(limit=2000, offset=0)
    results = list((listed or {}).get("results") or [])
    if limit is not None:
        results = results[: max(0, limit)]

    total = len(results)
    saved = 0
    print(f"Syncing {total} moves into MongoDB…")
    for index, entry in enumerate(results, start=1):
        name = entry.get("name") or ""
        if not name:
            continue
        payload = await client.get_move(name)
        if not payload:
            print(f"[{index}/{total}] skip missing {name}")
            continue
        repo.upsert_payload(payload)
        saved += 1
        if index % 25 == 0 or index == total:
            print(f"[{index}/{total}] saved {saved} (latest: {name})")
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)

    print(f"Done. Collection size: {repo.count()}")
    return saved


async def _run(*, limit: int | None, delay_seconds: float) -> int:
    try:
        return await sync_moves(limit=limit, delay_seconds=delay_seconds)
    finally:
        await shutdown_external_clients()


def main() -> None:
    parser = argparse.ArgumentParser(description="Populate MongoDB moves from PokéAPI")
    parser.add_argument("--limit", type=int, default=None, help="Optional cap for a test run")
    parser.add_argument(
        "--delay",
        type=float,
        default=0.05,
        help="Pause between move fetches (PokéAPI fair use)",
    )
    args = parser.parse_args()

    connect_mongo()
    try:
        asyncio.run(_run(limit=args.limit, delay_seconds=args.delay))
    finally:
        disconnect_mongo()


if __name__ == "__main__":
    main()
