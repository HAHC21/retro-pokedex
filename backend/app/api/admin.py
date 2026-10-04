from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies import SESSION_USER_KEY, get_admin_stats_service, get_auth_service, require_staff
from app.domain.user import User
from app.schemas.admin import AdminOverviewRead
from app.schemas.auth import LoginRequest, UserRead
from app.errors import AuthError
from app.services.admin_stats import AdminStatsService
from app.services.auth import AuthService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login", response_model=UserRead)
def admin_login(
    body: LoginRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserRead:
    try:
        user = auth_service.login_staff(str(body.email), body.password)
    except AuthError as exc:
        code = status.HTTP_401_UNAUTHORIZED if exc.code == "invalid_credentials" else status.HTTP_403_FORBIDDEN
        raise HTTPException(status_code=code, detail=exc.message) from exc
    request.session[SESSION_USER_KEY] = user.id
    return UserRead.from_domain(user)


@router.get("/overview", response_model=AdminOverviewRead)
def admin_overview(
    _staff: User = Depends(require_staff),
    stats: AdminStatsService = Depends(get_admin_stats_service),
) -> AdminOverviewRead:
    return stats.overview()
