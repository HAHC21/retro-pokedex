from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import (
    get_acquisition_service,
    get_catalog_service,
    get_learnset_service,
    get_moveset_service,
    get_obtainability_service,
    get_pokemon_detail_service,
    get_spawns_service,
    require_staff,
)
from app.domain.user import User
from app.services.acquisition import AcquisitionService
from app.services.catalog import CatalogService
from app.services.moveset import MovesetService
from app.services.obtainability import ObtainabilityService
from app.services.pokemon_detail import PokemonDetailService
from app.services.pokemon_learnset import PokemonLearnsetService
from app.services.spawns import SpawnsService

router = APIRouter(prefix="/poke", tags=["poke"])


@router.get("/catalog")
async def poke_catalog(service: CatalogService = Depends(get_catalog_service)) -> dict:
    """National Dex names + type membership in one compiled payload."""
    return await service.catalog()


@router.get("/forms")
async def poke_forms(service: CatalogService = Depends(get_catalog_service)) -> dict:
    """Mega, Gigantamax, and regional form rows."""
    return await service.alternate_forms()


@router.get("/pokemon/{pokemon_id}")
async def poke_pokemon(pokemon_id: int, service: PokemonDetailService = Depends(get_pokemon_detail_service)) -> dict:
    detail = await service.pokemon_detail(pokemon_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found")
    return detail


@router.get("/pokemon/{pokemon_id}/spawns")
async def poke_spawns(pokemon_id: int, service: SpawnsService = Depends(get_spawns_service)) -> dict:
    return await service.pokemon_spawns(pokemon_id)


@router.get("/pokemon/{pokemon_id}/moves")
async def poke_moves(
    pokemon_id: int,
    game: str = "home",
    service: PokemonLearnsetService = Depends(get_learnset_service),
) -> dict:
    try:
        return await service.learnset(pokemon_id, game)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found") from exc


@router.get("/pokemon/{pokemon_id}/movesets/smogon")
async def poke_smogon_movesets(
    pokemon_id: int,
    game: str = "home",
    service: MovesetService = Depends(get_moveset_service),
) -> dict:
    try:
        return await service.smogon_movesets(pokemon_id, game)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found") from exc


@router.get("/pokemon/{pokemon_id}/movesets/ai")
async def poke_ai_movesets(
    pokemon_id: int,
    game: str = "home",
    service: MovesetService = Depends(get_moveset_service),
) -> dict:
    try:
        return await service.ai_movesets(pokemon_id, game, force=False)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found") from exc
    except Exception:
        return {
            "game": game,
            "pokemon_id": pokemon_id,
            "available": False,
            "provider": None,
            "message": "We apologize, AI suggestions by Gemini is not available right now.",
            "sets": [],
            "cached": False,
        }


@router.post("/pokemon/{pokemon_id}/movesets/ai/refresh")
async def poke_refresh_ai_movesets(
    pokemon_id: int,
    game: str = "home",
    _staff: User = Depends(require_staff),
    service: MovesetService = Depends(get_moveset_service),
) -> dict:
    try:
        return await service.ai_movesets(pokemon_id, game, force=True)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found") from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We apologize, AI suggestions by Gemini is not available right now.",
        ) from exc


@router.get("/pokemon/{pokemon_id}/obtain")
async def poke_obtain(pokemon_id: int, service: ObtainabilityService = Depends(get_obtainability_service)) -> dict:
    return await service.obtain_meta(pokemon_id)


@router.get("/obtainability")
async def poke_obtainability(
    limit: int = 1025,
    service: ObtainabilityService = Depends(get_obtainability_service),
) -> dict:
    """Bulk National Dex obtain versions + evolves_from from the slim Mongo index."""
    capped = max(1, min(limit, 1025))
    return await service.obtain_index(limit=capped)


@router.get("/pokemon/{pokemon_id}/acquisition")
async def poke_acquisition(
    pokemon_id: int,
    game: str = "home",
    service: AcquisitionService = Depends(get_acquisition_service),
) -> dict:
    return await service.acquisition(pokemon_id, game)


@router.get("/regional/{game_key}")
async def poke_regional(game_key: str, service: CatalogService = Depends(get_catalog_service)) -> dict:
    try:
        return await service.regional_dex(game_key)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown game") from exc
