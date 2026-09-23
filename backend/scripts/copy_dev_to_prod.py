"""Replace the production MongoDB database with a copy of the dev database.

Source defaults to ``DEV_MONGODB_URI``, then ``MONGODB_URI`` from the
environment or ``backend/.env``. Destination is ``PROD_MONGODB_URI`` or
``--dest``. The destination is never taken from ``MONGODB_URI``.

Each user collection on the destination is replaced only after its copy has
been written. Indexes are recreated from the source. Collections that exist
only on the destination are dropped so production matches dev. Pass
``--keep-extra`` to leave those collections in place.

Usage (from backend/, with the venv active):

    $env:PROD_MONGODB_URI = "mongodb+srv://USER:PASSWORD@HOST/pokedex?retryWrites=true&w=majority"
    python -m scripts.copy_dev_to_prod
    python -m scripts.copy_dev_to_prod --yes

Without ``--yes`` the script prints the plan and exits.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import PyMongoError

BATCH_SIZE = 500
TEMP_SUFFIX = "__copy_tmp"
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _database_identity(uri: str) -> tuple[str, str]:
    parsed = urlparse(uri)
    host = (parsed.hostname or "").lower()
    database = parsed.path.strip("/").split("/", 1)[0]
    if not host or not database:
        raise SystemExit(
            "Each URI needs a host and a database name, for example "
            "mongodb+srv://USER:PASSWORD@HOST/pokedex?retryWrites=true&w=majority"
        )
    return host, database


def _describe(uri: str) -> str:
    host, database = _database_identity(uri)
    return f"{host}/{database}"


def _user_collections(database: Database) -> list[str]:
    names: list[str] = []
    for info in database.list_collections():
        name = info.get("name") or ""
        if not name or name.startswith("system.") or name.endswith(TEMP_SUFFIX):
            continue
        if info.get("type", "collection") != "collection":
            continue
        names.append(name)
    return sorted(names)


def _copy_indexes(source: Collection, destination: Collection) -> None:
    for name, info in source.index_information().items():
        if name == "_id_":
            continue
        options: dict[str, object] = {"name": name}
        for key in ("unique", "sparse", "expireAfterSeconds"):
            if key in info:
                options[key] = info[key]
        destination.create_index(info["key"], **options)


def _copy_collection(source_db: Database, dest_db: Database, name: str) -> int:
    source = source_db[name]
    temp_name = f"{name}{TEMP_SUFFIX}"
    if temp_name in dest_db.list_collection_names():
        dest_db.drop_collection(temp_name)
    dest_db.create_collection(temp_name)
    temp = dest_db[temp_name]

    copied = 0
    batch: list[dict] = []
    for document in source.find(batch_size=BATCH_SIZE):
        batch.append(document)
        if len(batch) >= BATCH_SIZE:
            temp.insert_many(batch, ordered=True)
            copied += len(batch)
            batch = []
    if batch:
        temp.insert_many(batch, ordered=True)
        copied += len(batch)

    _copy_indexes(source, temp)
    temp.rename(name, dropTarget=True)
    return copied


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        help="Dev MongoDB URI. Defaults to DEV_MONGODB_URI, then MONGODB_URI.",
    )
    parser.add_argument(
        "--dest",
        help="Production MongoDB URI. Defaults to PROD_MONGODB_URI.",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Replace production data. Without this flag the script only prints the plan.",
    )
    parser.add_argument(
        "--keep-extra",
        action="store_true",
        help="Leave destination collections that do not exist on the source.",
    )
    args = parser.parse_args()

    _load_dotenv(ENV_PATH)
    source_uri = args.source or os.environ.get("DEV_MONGODB_URI") or os.environ.get("MONGODB_URI") or ""
    dest_uri = args.dest or os.environ.get("PROD_MONGODB_URI") or ""
    if not source_uri.strip():
        raise SystemExit("Set DEV_MONGODB_URI or MONGODB_URI, or pass --source.")
    if not dest_uri.strip():
        raise SystemExit("Set PROD_MONGODB_URI or pass --dest. MONGODB_URI is not used as the destination.")

    source_id = _database_identity(source_uri)
    dest_id = _database_identity(dest_uri)
    if source_id == dest_id:
        raise SystemExit("Source and destination are the same database. Refusing to copy.")

    source_client = MongoClient(source_uri, serverSelectionTimeoutMS=10000)
    dest_client = MongoClient(dest_uri, serverSelectionTimeoutMS=10000)
    try:
        source_db = source_client.get_default_database()
        dest_db = dest_client.get_default_database()
        source_client.admin.command("ping")
        dest_client.admin.command("ping")

        source_names = _user_collections(source_db)
        dest_only = sorted(set(_user_collections(dest_db)) - set(source_names))

        print(f"Source:      {_describe(source_uri)}")
        print(f"Destination: {_describe(dest_uri)}")
        print("Collections to replace:")
        if not source_names:
            print("  (none)")
        for name in source_names:
            print(f"  {name}: {source_db[name].count_documents({})} documents")
        if dest_only:
            action = "leave in place" if args.keep_extra else "drop"
            print(f"Destination-only collections to {action}:")
            for name in dest_only:
                print(f"  {name}: {dest_db[name].count_documents({})} documents")

        if not args.yes:
            print("Dry run only. Re-run with --yes to replace the destination database.")
            return

        for name in source_names:
            copied = _copy_collection(source_db, dest_db, name)
            print(f"Copied {name}: {copied} documents")
        if dest_only and not args.keep_extra:
            for name in dest_only:
                dest_db.drop_collection(name)
                print(f"Dropped destination-only collection {name}")
        print("Copy finished.")
    except PyMongoError as exc:
        raise SystemExit(f"MongoDB copy failed: {exc}") from exc
    finally:
        source_client.close()
        dest_client.close()


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(1)
