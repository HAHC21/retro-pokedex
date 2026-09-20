from functools import lru_cache

from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings
from app.domain.user import User
from app.integrations.email.sender import build_email_sender
from app.integrations.oidc import OidcClientRegistry
from app.integrations.pokeapi.client import PokeApiClient
from app.repositories.json_collection_repository import JsonFileCollectionRepository
from app.repositories.mongo_user_repository import MongoUserRepository
from app.repositories.pokeapi_cache_repository import PokeApiCacheRepository
from app.repositories.pokeapi_pokemon_repository import PokeApiPokemonRepository
from app.services.auth_service import AuthService
from app.services.poke_proxy_service import PokeProxyService
from app.services.pokemon_service import CollectionService, PokemonService

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
def get_pokemon_repository() -> PokeApiPokemonRepository:
    return PokeApiPokemonRepository(get_pokeapi_client())


@lru_cache
def get_collection_repository() -> JsonFileCollectionRepository:
    return JsonFileCollectionRepository(settings.collection_data_path)


@lru_cache
def get_user_repository() -> MongoUserRepository:
    return MongoUserRepository()


@lru_cache
def get_oidc_registry() -> OidcClientRegistry:
    return OidcClientRegistry(settings)


@lru_cache
def get_poke_proxy_service() -> PokeProxyService:
    return PokeProxyService(get_pokeapi_client())


def get_pokemon_service() -> PokemonService:
    return PokemonService(get_pokemon_repository(), get_collection_repository())


def get_collection_service() -> CollectionService:
    return CollectionService(get_pokemon_repository(), get_collection_repository())


def get_auth_service() -> AuthService:
    return AuthService(get_user_repository(), build_email_sender())


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


async def shutdown_external_clients() -> None:
    await get_pokeapi_client().aclose()
    get_pokeapi_client.cache_clear()
    get_pokemon_repository.cache_clear()
    get_oidc_registry.cache_clear()
    get_user_repository.cache_clear()
    get_pokeapi_cache_repository.cache_clear()
    get_poke_proxy_service.cache_clear()
