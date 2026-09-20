from fastapi import APIRouter, Depends

from app.dependencies import get_pokemon_service
from app.schemas.region import DashboardRead
from app.services.pokemon_service import PokemonService

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardRead)
async def get_dashboard(service: PokemonService = Depends(get_pokemon_service)) -> DashboardRead:
    return await service.get_dashboard()
