from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_collection_service
from app.schemas.collection import CatchWrite, CaughtPokemonRead
from app.services.pokemon_service import CollectionService, PokemonNotFoundError

router = APIRouter(prefix="/collection", tags=["collection"])


@router.get("", response_model=list[CaughtPokemonRead])
def list_collection(
    service: CollectionService = Depends(get_collection_service),
) -> list[CaughtPokemonRead]:
    return service.list_caught()


@router.put("/{pokemon_id}", response_model=CaughtPokemonRead)
async def catch_pokemon(
    pokemon_id: int,
    payload: CatchWrite,
    service: CollectionService = Depends(get_collection_service),
) -> CaughtPokemonRead:
    try:
        result = await service.set_caught(pokemon_id, payload)
    except PokemonNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokemon not found") from error
    if result is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select normal, shiny, or both")
    return result


@router.delete("/{pokemon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_pokemon(
    pokemon_id: int,
    service: CollectionService = Depends(get_collection_service),
) -> None:
    try:
        await service.set_caught(pokemon_id, CatchWrite(normal=False, shiny=False))
    except PokemonNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokemon not found") from error
