from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_poke_proxy_service
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


@router.get("/pokemon/{pokemon_id}/obtain")
async def poke_obtain(pokemon_id: int, service: PokeProxyService = Depends(get_poke_proxy_service)) -> dict:
    return await service.obtain_meta(pokemon_id)


@router.get("/regional/{game_key}")
async def poke_regional(game_key: str, service: PokeProxyService = Depends(get_poke_proxy_service)) -> dict:
    try:
        return await service.regional_dex(game_key)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown game") from exc
