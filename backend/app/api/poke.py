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
from app.schemas.acquisition import AcquisitionRead
from app.schemas.catalog import CatalogRead, FormsRead, RegionalDexRead
from app.schemas.learnset import LearnsetRead
from app.schemas.moveset import AiMovesetsRead, SmogonMovesetsRead
from app.schemas.obtainability import ObtainIndexRead, ObtainMetaRead
from app.schemas.pokemon_detail import PokemonDetailRead
from app.schemas.spawns import SpawnsRead
from app.services.acquisition import AcquisitionService
from app.services.catalog import CatalogService
from app.services.moveset import MovesetService
from app.services.obtainability import ObtainabilityService
from app.services.pokemon_detail import PokemonDetailService
from app.services.pokemon_learnset import PokemonLearnsetService
from app.services.spawns import SpawnsService

router = APIRouter(prefix="/poke", tags=["poke"])


@router.get("/catalog", response_model=CatalogRead)
async def poke_catalog(service: CatalogService = Depends(get_catalog_service)) -> CatalogRead:
    """National Dex names + type membership in one compiled payload."""
    return await service.catalog()


@router.get("/forms", response_model=FormsRead)
async def poke_forms(service: CatalogService = Depends(get_catalog_service)) -> FormsRead:
    """Mega, Gigantamax, and regional form rows."""
    return await service.alternate_forms()


@router.get("/pokemon/{pokemon_id}", response_model=PokemonDetailRead)
async def poke_pokemon(pokemon_id: int, service: PokemonDetailService = Depends(get_pokemon_detail_service)) -> PokemonDetailRead:
    detail = await service.pokemon_detail(pokemon_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found")
    return detail


@router.get("/pokemon/{pokemon_id}/spawns", response_model=SpawnsRead)
async def poke_spawns(pokemon_id: int, service: SpawnsService = Depends(get_spawns_service)) -> SpawnsRead:
    return await service.pokemon_spawns(pokemon_id)


@router.get("/pokemon/{pokemon_id}/moves", response_model=LearnsetRead)
async def poke_moves(
    pokemon_id: int,
    game: str = "home",
    service: PokemonLearnsetService = Depends(get_learnset_service),
) -> LearnsetRead:
    try:
        return await service.learnset(pokemon_id, game)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found") from exc


@router.get("/pokemon/{pokemon_id}/movesets/smogon", response_model=SmogonMovesetsRead)
async def poke_smogon_movesets(
    pokemon_id: int,
    game: str = "home",
    service: MovesetService = Depends(get_moveset_service),
) -> SmogonMovesetsRead:
    try:
        return await service.smogon_movesets(pokemon_id, game)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found") from exc


@router.get("/pokemon/{pokemon_id}/movesets/ai", response_model=AiMovesetsRead)
async def poke_ai_movesets(
    pokemon_id: int,
    game: str = "home",
    service: MovesetService = Depends(get_moveset_service),
) -> AiMovesetsRead:
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


@router.post("/pokemon/{pokemon_id}/movesets/ai/refresh", response_model=AiMovesetsRead)
async def poke_refresh_ai_movesets(
    pokemon_id: int,
    game: str = "home",
    _staff: User = Depends(require_staff),
    service: MovesetService = Depends(get_moveset_service),
) -> AiMovesetsRead:
    try:
        return await service.ai_movesets(pokemon_id, game, force=True)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found") from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We apologize, AI suggestions by Gemini is not available right now.",
        ) from exc


@router.get("/pokemon/{pokemon_id}/obtain", response_model=ObtainMetaRead)
async def poke_obtain(pokemon_id: int, service: ObtainabilityService = Depends(get_obtainability_service)) -> ObtainMetaRead:
    return await service.obtain_meta(pokemon_id)


@router.get("/obtainability", response_model=ObtainIndexRead)
async def poke_obtainability(
    limit: int = 1025,
    service: ObtainabilityService = Depends(get_obtainability_service),
) -> ObtainIndexRead:
    """Bulk National Dex obtain versions + evolves_from from the slim Mongo index."""
    capped = max(1, min(limit, 1025))
    return await service.obtain_index(limit=capped)


@router.get("/pokemon/{pokemon_id}/acquisition", response_model=AcquisitionRead)
async def poke_acquisition(
    pokemon_id: int,
    game: str = "home",
    service: AcquisitionService = Depends(get_acquisition_service),
) -> AcquisitionRead:
    return await service.acquisition(pokemon_id, game)


@router.get("/regional/{game_key}", response_model=RegionalDexRead)
async def poke_regional(game_key: str, service: CatalogService = Depends(get_catalog_service)) -> RegionalDexRead:
    try:
        return await service.regional_dex(game_key)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown game") from exc
