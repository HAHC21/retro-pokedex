from urllib.parse import urlencode

from authlib.integrations.base_client import OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.public_urls import auth_public_base, frontend_public_origin
from app.dependencies import SESSION_USER_KEY, get_auth_service, get_current_user, get_oidc_registry
from app.domain.user import User
from app.integrations.email.sender import EmailSendError
from app.integrations.oidc import PROVIDERS, IncompleteOidcClaimsError, OidcClientRegistry, claims_from_token
from app.schemas.auth import (
    AuthProvidersRead,
    ForgotPasswordRequest,
    LoginRequest,
    ProviderStatus,
    RegisterRequest,
    RegisterResponse,
    ResendConfirmationRequest,
    ResetPasswordRequest,
    UserRead,
)
from app.services.auth_service import AuthError, AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/providers", response_model=AuthProvidersRead)
def list_providers(registry: OidcClientRegistry = Depends(get_oidc_registry)) -> AuthProvidersRead:
    enabled = registry.enabled_providers()
    return AuthProvidersRead(
        google=_status("google", enabled["google"]),
        microsoft=_status("microsoft", enabled["microsoft"]),
        password=True,
    )


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.from_domain(user)


@router.post("/register", response_model=RegisterResponse)
async def register(
    body: RegisterRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> RegisterResponse:
    try:
        result = await auth_service.register(
            str(body.email),
            body.password,
            body.name,
            public_api_base=auth_public_base(request),
        )
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc
    except EmailSendError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return RegisterResponse(email=result.email, message=result.message, confirm_url=result.confirm_url)


@router.post("/login", response_model=UserRead)
def login(
    body: LoginRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserRead:
    try:
        user = auth_service.login(str(body.email), body.password)
    except AuthError as exc:
        code = status.HTTP_403_FORBIDDEN if exc.code == "email_unverified" else status.HTTP_401_UNAUTHORIZED
        raise HTTPException(status_code=code, detail=exc.message) from exc
    request.session[SESSION_USER_KEY] = user.id
    return UserRead.from_domain(user)


@router.post("/resend-confirmation", response_model=RegisterResponse)
async def resend_confirmation(
    body: ResendConfirmationRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> RegisterResponse:
    try:
        result = await auth_service.resend_confirmation(
            str(body.email),
            public_api_base=auth_public_base(request),
        )
    except EmailSendError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return RegisterResponse(email=result.email, message=result.message, confirm_url=result.confirm_url)


@router.post("/forgot-password", response_model=RegisterResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> RegisterResponse:
    try:
        result = await auth_service.request_password_reset(
            str(body.email),
            public_frontend_origin=frontend_public_origin(request),
        )
    except EmailSendError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return RegisterResponse(email=result.email, message=result.message, confirm_url=result.confirm_url)


@router.post("/reset-password", response_model=UserRead)
def reset_password(
    body: ResetPasswordRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserRead:
    try:
        user = auth_service.reset_password(body.token, body.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc
    request.session[SESSION_USER_KEY] = user.id
    return UserRead.from_domain(user)


@router.get("/confirm")
def confirm_email(
    token: str,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        user = auth_service.confirm_email(token)
    except AuthError:
        return _frontend_redirect(auth_error="confirm_failed")
    request.session[SESSION_USER_KEY] = user.id
    return _frontend_redirect(signed_in="1")


@router.post("/logout")
def logout(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"ok": True}


@router.get("/{provider}/login")
async def oauth_login(
    provider: str,
    request: Request,
    registry: OidcClientRegistry = Depends(get_oidc_registry),
):
    client = _client(provider, registry)
    return await client.authorize_redirect(request, _callback_url(provider))


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    registry: OidcClientRegistry = Depends(get_oidc_registry),
    auth_service: AuthService = Depends(get_auth_service),
):
    error = request.query_params.get("error")
    if error:
        return _frontend_redirect(auth_error=error)
    try:
        client = _client(provider, registry)
        token = await client.authorize_access_token(request)
        user = auth_service.authenticate(claims_from_token(provider, token))
    except (KeyError, IncompleteOidcClaimsError, ValueError, OAuthError):
        return _frontend_redirect(auth_error="signin_failed")
    request.session[SESSION_USER_KEY] = user.id
    return _frontend_redirect(signed_in="1")


def _status(provider: str, enabled: bool) -> ProviderStatus:
    return ProviderStatus(
        enabled=enabled,
        login_url=f"{settings.api_prefix}/auth/{provider}/login" if enabled else None,
    )


def _client(provider: str, registry: OidcClientRegistry):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown provider")
    if not registry.is_configured(provider):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{provider} sign-in is not configured",
        )
    return registry.client(provider)


def _callback_url(provider: str) -> str:
    # OAuth redirect URIs are registered in the provider console; always use config.
    return f"{settings.auth_redirect_base_url.rstrip('/')}{settings.api_prefix}/auth/{provider}/callback"


def _frontend_redirect(**query: str) -> RedirectResponse:
    target = settings.frontend_origin.rstrip("/") + "/"
    if query:
        target = f"{target}?{urlencode(query)}"
    return RedirectResponse(url=target, status_code=status.HTTP_302_FOUND)
