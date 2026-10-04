from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.collection import router as collection_router
from app.api.poke import router as poke_router
from app.api.scanner import router as scanner_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(collection_router)
api_router.include_router(poke_router)
api_router.include_router(scanner_router)
