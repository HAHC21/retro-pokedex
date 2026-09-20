from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.catalog.regions import DEFAULT_REGION_SLUG
from app.dependencies import get_pokemon_service
from app.schemas.pokemon import PokemonDetail, PokemonListResponse
from app.schemas.region import RegionRead
from app.services.pokemon_service import PokemonNotFoundError, PokemonService, RegionNotFoundError

router = APIRouter(prefix="/pokemon", tags=["pokemon"])


@router.get("/regions", response_model=list[RegionRead])
def list_regions(service: PokemonService = Depends(get_pokemon_service)) -> list[RegionRead]:
    return service.list_regions()


@router.get("", response_model=PokemonListResponse)
async def list_pokemon(
    region: str = Query(default=DEFAULT_REGION_SLUG),
    service: PokemonService = Depends(get_pokemon_service),
) -> PokemonListResponse:
    try:
        return await service.list_pokemon(region_slug=region)
    except RegionNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found") from error


@router.get("/{pokemon_id}", response_model=PokemonDetail)
async def get_pokemon(
    pokemon_id: int,
    service: PokemonService = Depends(get_pokemon_service),
) -> PokemonDetail:
    try:
        return await service.get_pokemon(pokemon_id)
    except PokemonNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokemon not found") from error
