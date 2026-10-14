import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError

from app.dependencies import get_current_user, get_owned_pokemon_service, get_user_collection_service, require_staff
from app.domain.user import User
from app.schemas.collection import (
    MarkEntryRead,
    MarkEntryWrite,
    OwnedIndexRead,
    OwnedPokemonBatchRead,
    OwnedPokemonBatchWrite,
    OwnedPokemonListRead,
    OwnedPokemonRead,
    OwnedPokemonUpdate,
    OwnedPokemonWrite,
    ProgressRead,
    ProgressWrite,
)
from app.services.owned_pokemon import OwnedPokemonService
from app.services.user_collection import UserCollectionService

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/collection", tags=["collection"])


@router.get("/progress", response_model=ProgressRead)
def read_progress(
    user: User = Depends(get_current_user),
    service: UserCollectionService = Depends(get_user_collection_service),
) -> ProgressRead:
    return ProgressRead(progress=service.get_progress(user.id))


@router.put("/progress", response_model=ProgressRead)
def write_progress(
    body: ProgressWrite,
    user: User = Depends(get_current_user),
    service: UserCollectionService = Depends(get_user_collection_service),
) -> ProgressRead:
    mode = (body.mode or "merge").strip().lower()
    if mode == "replace":
        progress = service.replace_progress(user.id, body.progress)
    elif mode == "merge":
        progress = service.merge_progress(user.id, body.progress)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="mode must be merge or replace")
    return ProgressRead(progress=progress)


@router.put("/marks/{game}/{pokemon_id}", response_model=MarkEntryRead)
def upsert_mark(
    game: str,
    pokemon_id: int,
    body: MarkEntryWrite,
    form: str = "base",
    user: User = Depends(get_current_user),
    service: UserCollectionService = Depends(get_user_collection_service),
) -> MarkEntryRead:
    if pokemon_id < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Pokémon id")
    mark = service.upsert_mark(
        user.id,
        game=game,
        pokemon_id=pokemon_id,
        form=form or "base",
        mark=body.model_dump(),
    )
    return MarkEntryRead(game=game, pokemon_id=pokemon_id, mark=mark)


@router.get("/owned/index", response_model=OwnedIndexRead)
def owned_index(
    user: User = Depends(get_current_user),
    service: OwnedPokemonService = Depends(get_owned_pokemon_service),
) -> OwnedIndexRead:
    rows = service.list_index(user.id)
    return OwnedIndexRead(items=rows)


@router.get("/owned", response_model=OwnedPokemonListRead)
def list_owned(
    pokemon_id: int = Query(ge=1),
    game: str | None = None,
    user: User = Depends(get_current_user),
    service: OwnedPokemonService = Depends(get_owned_pokemon_service),
) -> OwnedPokemonListRead:
    game_key = game.strip() if game else None
    items = service.list_for_species(user.id, pokemon_id, game_key=game_key)
    traits = service.collected_traits(user.id, pokemon_id, game_key=game_key)
    return OwnedPokemonListRead(
        items=[OwnedPokemonRead.from_domain(item) for item in items],
        collected_abilities=traits["abilities"],
        collected_natures=traits["natures"],
    )


@router.post("/owned", response_model=OwnedPokemonRead, status_code=status.HTTP_201_CREATED)
def create_owned(
    body: OwnedPokemonWrite,
    user: User = Depends(get_current_user),
    service: OwnedPokemonService = Depends(get_owned_pokemon_service),
) -> OwnedPokemonRead:
    created = service.create(user.id, body.model_dump())
    return OwnedPokemonRead.from_domain(created)


@router.post("/owned/from-pk", response_model=OwnedPokemonRead, status_code=status.HTTP_201_CREATED)
def create_owned_from_pk(
    body: OwnedPokemonWrite,
    user: User = Depends(get_current_user),
    service: OwnedPokemonService = Depends(get_owned_pokemon_service),
) -> OwnedPokemonRead:
    payload = body.model_dump()
    payload["source_type"] = "pk"
    created = service.create(user.id, payload)
    return OwnedPokemonRead.from_domain(created)


def _item_error(exc: ValidationError) -> str:
    parts: list[str] = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", ()))
        msg = str(err.get("msg") or "Invalid value")
        parts.append(f"{loc}: {msg}" if loc else msg)
    return "; ".join(parts) or "Invalid item"


def _split_pk_batch(items: list[dict[str, Any]]) -> tuple[list[tuple[int, dict[str, Any]]], list[dict[str, Any]]]:
    """Keep readable items. A bad item is reported and does not discard the rest."""
    payloads: list[tuple[int, dict[str, Any]]] = []
    failures: list[dict[str, Any]] = []
    for index, item in enumerate(items):
        try:
            payloads.append((index, OwnedPokemonWrite.model_validate(item).model_dump()))
        except ValidationError as exc:
            errors = exc.errors()
            logger.error(
                "pk-batch item failed index=%s filename=%s pokemon_id=%s nickname=%s level=%s met_level=%s errors=%s item=%s",
                index,
                item.get("filename"),
                item.get("pokemon_id"),
                item.get("nickname"),
                item.get("level"),
                item.get("met_level"),
                json.dumps(errors, default=str),
                json.dumps(item, default=str),
            )
            failures.append({"index": index, "filename": item.get("filename"), "error": _item_error(exc)})
    return payloads, failures


@router.post("/owned/from-pk-batch", response_model=OwnedPokemonBatchRead, status_code=status.HTTP_201_CREATED)
def create_owned_from_pk_batch(
    body: OwnedPokemonBatchWrite,
    user: User = Depends(require_staff),
    service: OwnedPokemonService = Depends(get_owned_pokemon_service),
) -> OwnedPokemonBatchRead:
    indexed, skipped = _split_pk_batch(body.items)
    result = service.create_batch(
        user.id,
        [payload for _, payload in indexed],
        filename=body.filename,
        indexes=[index for index, _ in indexed],
    )
    errors = [*skipped, *result["errors"]]
    result["failed"] = len(skipped) + result["failed"]
    result["errors"] = errors[:50]
    return OwnedPokemonBatchRead.model_validate(result)


@router.patch("/owned/{owned_id}", response_model=OwnedPokemonRead)
def update_owned(
    owned_id: str,
    body: OwnedPokemonUpdate,
    user: User = Depends(get_current_user),
    service: OwnedPokemonService = Depends(get_owned_pokemon_service),
) -> OwnedPokemonRead:
    updated = service.update(user.id, owned_id, body.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owned Pokémon not found")
    return OwnedPokemonRead.from_domain(updated)


@router.delete("/owned/{owned_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_owned(
    owned_id: str,
    user: User = Depends(get_current_user),
    service: OwnedPokemonService = Depends(get_owned_pokemon_service),
) -> None:
    if not service.delete(user.id, owned_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owned Pokémon not found")
