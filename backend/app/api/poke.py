from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_moveset_service, get_poke_proxy_service, require_staff
from app.domain.user import User
from app.services.moveset_service import MovesetService
from app.services.poke_proxy_service import PokeProxyService

router = APIRouter(prefix="/poke", tags=["poke"])


@router.get("/index")
async def poke_index(service: PokeProxyService = Depends(get_poke_proxy_service)) -> dict:
    names = await service.name_index()
    return {"names": names}


@router.get("/types/{type_name}")
async def poke_type(type_name: str, service: PokeProxyService = Depends(get_poke_proxy_service)) -> dict:
    ids = await service.type_ids(type_name)
    return {"ids": ids}


@router.get("/pokemon/{pokemon_id}")
async def poke_pokemon(pokemon_id: int, service: PokeProxyService = Depends(get_poke_proxy_service)) -> dict:
    detail = await service.pokemon_detail(pokemon_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokémon not found")
    return detail


@router.get("/pokemon/{pokemon_id}/spawns")
async def poke_spawns(pokemon_id: int, service: PokeProxyService = Depends(get_poke_proxy_service)) -> dict:
    return await service.pokemon_spawns(pokemon_id)


@router.get("/pokemon/{pokemon_id}/moves")
async def poke_moves(
    pokemon_id: int,
    game: str = "home",
    service: PokeProxyService = Depends(get_poke_proxy_service),
) -> dict:
    try:
        return await service.pokemon_learnset(pokemon_id, game)
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
async def poke_obtain(pokemon_id: int, service: PokeProxyService = Depends(get_poke_proxy_service)) -> dict:
    return await service.obtain_meta(pokemon_id)


@router.get("/regional/{game_key}")
async def poke_regional(game_key: str, service: PokeProxyService = Depends(get_poke_proxy_service)) -> dict:
    try:
        return await service.regional_dex(game_key)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown game") from exc
