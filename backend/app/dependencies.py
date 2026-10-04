from functools import lru_cache

from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings
from app.domain.roles import is_staff
from app.domain.user import User
from app.integrations.email.sender import build_email_sender
from app.integrations.gemini.client import GeminiMovesetClient
from app.integrations.google.insights import GoogleInsightsClient
from app.integrations.oidc import OidcClientRegistry
from app.integrations.pokeapi.client import PokeApiClient
from app.integrations.smogon.client import SmogonSetsClient
from app.repositories.login_event import LoginEventRepository
from app.repositories.site_activity import SiteActivityRepository
from app.repositories.mongo_user import MongoUserRepository
from app.repositories.pokeapi_cache import PokeApiCacheRepository
from app.repositories.owned_pokemon import OwnedPokemonRepository
from app.repositories.pokemon_ai_moveset import PokemonAiMovesetRepository
from app.repositories.pokemon_overview import PokemonOverviewRepository
from app.repositories.user_collection import UserCollectionRepository
from app.services.acquisition import AcquisitionService
from app.services.admin_stats import AdminStatsService
from app.services.auth import AuthService
from app.services.box_scan import BoxScanService
from app.services.catalog import CatalogService
from app.services.moveset import MovesetService
from app.services.obtainability import ObtainabilityService
from app.services.owned_pokemon import OwnedPokemonService
from app.services.pokemon_detail import PokemonDetailService
from app.services.pokemon_learnset import PokemonLearnsetService
from app.services.spawns import SpawnsService
from app.services.user_collection import UserCollectionService

SESSION_USER_KEY = "user_id"

@lru_cache
def get_pokeapi_cache_repository() -> PokeApiCacheRepository:
    return PokeApiCacheRepository()


@lru_cache
def get_pokeapi_client() -> PokeApiClient:
    return PokeApiClient(
        base_url=settings.pokeapi_base_url,
        user_agent=settings.pokeapi_user_agent,
        cache=get_pokeapi_cache_repository(),
        ttl_seconds=settings.pokeapi_cache_ttl_seconds,
    )


@lru_cache
def get_smogon_client() -> SmogonSetsClient:
    return SmogonSetsClient(
        base_url=settings.smogon_sets_base_url,
        cache=get_pokeapi_cache_repository(),
        ttl_seconds=settings.smogon_cache_ttl_seconds,
        user_agent=settings.pokeapi_user_agent,
    )


@lru_cache
def get_gemini_client() -> GeminiMovesetClient:
    return GeminiMovesetClient(api_key=settings.gemini_api_key, model=settings.gemini_model)


@lru_cache
def get_ai_moveset_repository() -> PokemonAiMovesetRepository:
    return PokemonAiMovesetRepository()


@lru_cache
def get_moveset_service() -> MovesetService:
    return MovesetService(
        get_smogon_client(),
        get_gemini_client(),
        ai_movesets=get_ai_moveset_repository(),
    )


@lru_cache
def get_user_repository() -> MongoUserRepository:
    return MongoUserRepository()


@lru_cache
def get_user_collection_repository() -> UserCollectionRepository:
    return UserCollectionRepository()


@lru_cache
def get_owned_pokemon_repository() -> OwnedPokemonRepository:
    return OwnedPokemonRepository()


@lru_cache
def get_oidc_registry() -> OidcClientRegistry:
    return OidcClientRegistry(settings)


@lru_cache
def get_pokemon_overview_repository() -> PokemonOverviewRepository:
    return PokemonOverviewRepository()


def get_catalog_service() -> CatalogService:
    return CatalogService()


def get_pokemon_detail_service() -> PokemonDetailService:
    return PokemonDetailService()


def get_spawns_service() -> SpawnsService:
    return SpawnsService()


def get_learnset_service() -> PokemonLearnsetService:
    return PokemonLearnsetService()


def get_obtainability_service() -> ObtainabilityService:
    return ObtainabilityService()


def get_acquisition_service() -> AcquisitionService:
    return AcquisitionService()


def get_box_scan_service() -> BoxScanService:
    return BoxScanService()


def get_user_collection_service() -> UserCollectionService:
    return UserCollectionService(get_user_collection_repository())


def get_owned_pokemon_service() -> OwnedPokemonService:
    return OwnedPokemonService(get_owned_pokemon_repository(), get_user_collection_repository())


@lru_cache
def get_login_event_repository() -> LoginEventRepository:
    return LoginEventRepository()


@lru_cache
def get_google_insights_client() -> GoogleInsightsClient:
    return GoogleInsightsClient(settings)


def get_admin_stats_service() -> AdminStatsService:
    return AdminStatsService(
        get_login_event_repository(),
        SiteActivityRepository(),
        get_google_insights_client(),
    )


def get_auth_service() -> AuthService:
    return AuthService(
        get_user_repository(),
        build_email_sender(),
        get_login_event_repository(),
    )


def get_current_user(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    user_id = request.session.get(SESSION_USER_KEY)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    user = auth_service.get_user(str(user_id))
    if user is None:
        request.session.clear()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    return user


def require_staff(user: User = Depends(get_current_user)) -> User:
    if not is_staff(user.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")
    return user


async def shutdown_external_clients() -> None:
    await get_smogon_client().aclose()
    await get_gemini_client().aclose()
    get_smogon_client.cache_clear()
    get_gemini_client.cache_clear()
    get_moveset_service.cache_clear()
    get_ai_moveset_repository.cache_clear()
    get_oidc_registry.cache_clear()
    get_user_repository.cache_clear()
    get_user_collection_repository.cache_clear()
    get_owned_pokemon_repository.cache_clear()
    get_pokemon_overview_repository.cache_clear()
    get_pokeapi_cache_repository.cache_clear()
    get_google_insights_client.cache_clear()
