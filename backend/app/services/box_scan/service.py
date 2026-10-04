from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.db.user.box_scan_document import BoxScanDocument
from app.domain.roles import is_staff
from app.domain.user import User
from app.errors import BoxScanError, ScanBudgetError, ScanLimitError
from app.integrations.gemini.client import GeminiImageResult, GeminiMovesetClient, GeminiUsage
from app.services.box_scan.const import (
    DAILY_BUDGET_USD,
    DAILY_CAP,
    DAY,
    DEFAULT_PRICE_PER_M,
    FALLBACK_SCAN_USD,
    FORCE_GLOBAL_SCAN_LIMIT,
    MODEL_PRICES_PER_M,
    NEW_ACCOUNT_CAP,
    NEW_ACCOUNT_WINDOW,
    SOURCES,
)
from app.services.box_scan.helpers import (
    as_utc,
    count_since,
    day_start,
    iso,
    next_utc_midnight,
    oldest_since,
    prompt,
    slots,
)
from app.services.box_scan.models import ScanQuota


class BoxScanService:
    def scan_quota(self, user: User, now: datetime | None = None) -> dict[str, Any]:
        snapshot = self._snapshot(user, now)
        return {
            "allowance": snapshot.allowance,
            "used": snapshot.used,
            "remaining": snapshot.remaining,
            "new_account": snapshot.new_account,
            "next_available_at": iso(snapshot.next_available_at) if snapshot.next_available_at else None,
            "global_limit_reached": False if snapshot.exempt else self.global_limit_reached(),
            "global_resets_at": iso(next_utc_midnight()),
            "exempt": snapshot.exempt,
        }

    def reserve_scan(self, user: User) -> str:
        """Hold one scan before Gemini runs. Parallel requests cannot pass the cap."""
        moment = as_utc(datetime.now(timezone.utc))
        exempt = is_staff(user.role)
        if not exempt:
            quota = self._snapshot(user, moment)
            if quota.remaining < 1:
                raise ScanLimitError(quota.next_available_at)
        scan_id = str(uuid4())
        BoxScanDocument(scan_id=scan_id, user_id=user.id, scanned_at=moment).save()
        if not exempt:
            confirmed = self._snapshot(user, moment)
            if confirmed.used > confirmed.allowance:
                BoxScanDocument.objects(scan_id=scan_id).delete()
                raise ScanLimitError(confirmed.next_available_at)
        return scan_id

    def release_scan(self, scan_id: str) -> None:
        BoxScanDocument.objects(scan_id=scan_id).delete()

    def assert_global_budget(self, user: User, now: datetime | None = None) -> None:
        if is_staff(user.role):
            return
        if self.global_limit_reached(now):
            raise ScanBudgetError(next_utc_midnight(now))

    def record_scan_cost(self, scan_id: str, result: GeminiImageResult) -> float:
        prompt_tokens = result.usage.prompt_tokens
        output_tokens = result.usage.candidates_tokens + result.usage.thoughts_tokens
        cost = self.scan_cost_usd(result.model, result.usage)
        BoxScanDocument.objects(scan_id=scan_id).update_one(
            set__cost_usd=cost,
            set__model=result.model,
            set__prompt_tokens=prompt_tokens,
            set__output_tokens=output_tokens,
        )
        return cost

    def global_limit_reached(self, now: datetime | None = None) -> bool:
        if FORCE_GLOBAL_SCAN_LIMIT:
            return True
        return round(self.global_spend_usd(now), 6) >= DAILY_BUDGET_USD

    def global_spend_usd(self, now: datetime | None = None) -> float:
        start = day_start(now)
        total = 0.0
        for doc in BoxScanDocument.objects(scanned_at__gte=start).only("cost_usd"):
            total += float(doc.cost_usd or 0)
        return total

    def scan_cost_usd(self, model: str, usage: GeminiUsage) -> float:
        prompt_tokens = usage.prompt_tokens
        output_tokens = usage.candidates_tokens + usage.thoughts_tokens
        if prompt_tokens <= 0 and output_tokens <= 0:
            return FALLBACK_SCAN_USD
        input_rate, output_rate = MODEL_PRICES_PER_M.get(model, DEFAULT_PRICE_PER_M)
        cost = (prompt_tokens * input_rate + output_tokens * output_rate) / 1_000_000
        return round(cost, 6)

    async def analyze_box_screenshot(
        self,
        gemini: GeminiMovesetClient,
        *,
        source: str,
        image: bytes,
        mime_type: str,
    ) -> tuple[list[dict[str, Any]], GeminiImageResult]:
        label = SOURCES.get(source)
        if label is None:
            raise BoxScanError("Unknown screenshot source")
        if not gemini.available:
            raise BoxScanError("Scanner is not configured")
        if not image:
            raise BoxScanError("The screenshot was empty")
        try:
            result = await gemini.analyze_image(prompt=prompt(label, source), image=image, mime_type=mime_type)
        except RuntimeError as exc:
            raise BoxScanError("Could not read that screenshot") from exc
        return slots(result.data), result

    def _snapshot(self, user: User, now: datetime | None = None) -> ScanQuota:
        moment = as_utc(now or datetime.now(timezone.utc))
        created = as_utc(user.created_at)
        exempt = is_staff(user.role)
        if moment < created + NEW_ACCOUNT_WINDOW:
            used = count_since(user.id, created)
            remaining = max(0, NEW_ACCOUNT_CAP - used)
            return ScanQuota(
                allowance=NEW_ACCOUNT_CAP,
                used=used,
                remaining=remaining,
                new_account=True,
                next_available_at=None if remaining else created + NEW_ACCOUNT_WINDOW,
                exempt=exempt,
            )
        window_start = moment - DAY
        used = count_since(user.id, window_start)
        remaining = max(0, DAILY_CAP - used)
        next_at = None
        if remaining == 0:
            oldest = oldest_since(user.id, window_start)
            next_at = as_utc(oldest) + DAY if oldest else moment + DAY
        return ScanQuota(
            allowance=DAILY_CAP,
            used=used,
            remaining=remaining,
            new_account=False,
            next_available_at=next_at,
            exempt=exempt,
        )
