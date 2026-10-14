from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.dependencies import get_box_scan_service, get_current_user, get_gemini_client
from app.domain.user import User
from app.errors import BoxScanError, ScanBudgetError, ScanLimitError
from app.integrations.gemini.client import GeminiMovesetClient
from app.schemas.scanner import BoxScanRead, ScanQuotaRead
from app.services.box_scan import BoxScanService
from app.services.box_scan.const import SOURCES

router = APIRouter(prefix="/scanner", tags=["scanner"])

MAX_IMAGE_BYTES = 8_000_000
ALLOWED_TYPES = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
}


@router.get("/quota", response_model=ScanQuotaRead)
def read_quota(
    user: User = Depends(get_current_user),
    scans: BoxScanService = Depends(get_box_scan_service),
) -> ScanQuotaRead:
    return scans.scan_quota(user)


@router.post("/box", response_model=BoxScanRead)
async def analyze_box(
    source: str = Form(...),
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
    gemini: GeminiMovesetClient = Depends(get_gemini_client),
    scans: BoxScanService = Depends(get_box_scan_service),
) -> BoxScanRead:
    mime = ALLOWED_TYPES.get((image.content_type or "").split(";")[0].strip().lower())
    if mime is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a PNG, JPEG, or WebP screenshot.")
    raw = await image.read()
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That screenshot is too large.")
    if source not in SOURCES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown screenshot source.")
    try:
        scans.assert_global_budget(user)
    except ScanBudgetError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "global_budget", "resets_at": exc.resets_at.isoformat()},
        ) from exc
    try:
        scan_id = scans.reserve_scan(user)
    except ScanLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "scan_limit", "next_available_at": exc.next_available_at.isoformat() if exc.next_available_at else None},
        ) from exc
    try:
        slots, result = await scans.analyze_box_screenshot(gemini, source=source, image=raw, mime_type=mime)
    except BoxScanError as exc:
        scans.release_scan(scan_id)
        code = status.HTTP_503_SERVICE_UNAVAILABLE if "not configured" in str(exc) else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=code, detail=str(exc)) from exc
    except Exception:
        scans.release_scan(scan_id)
        raise
    scans.record_scan_cost(scan_id, result)
    return {"slots": slots}
