"""Google Analytics, Search Console, and Ads summaries for the admin dashboard.

Uses one service account. Each product still has to list that account:
Analytics property viewer, Search Console user, and Google Ads read-only user.
"""

from __future__ import annotations

import json
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import Settings

_SCOPES = (
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/adwords",
)
_SUCCESS_TTL_SECONDS = 15 * 60
_ERROR_TTL_SECONDS = 60
_ROW_LIMIT = 8


class GoogleApiError(Exception):
    pass


class _HttpxAuthResponse:
    def __init__(self, response: httpx.Response) -> None:
        self.status = response.status_code
        self.headers = response.headers
        self.data = response.content


class _HttpxAuthRequest:
    """google-auth token refresh without the requests package."""

    def __init__(self, http: httpx.Client) -> None:
        self._http = http

    def __call__(
        self,
        url: str,
        method: str = "GET",
        body: bytes | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
        **_: Any,
    ) -> _HttpxAuthResponse:
        if isinstance(timeout, tuple):
            timeout = timeout[0]
        response = self._http.request(method, url, content=body, headers=headers, timeout=timeout or 12)
        return _HttpxAuthResponse(response)


class GoogleInsightsClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._cached: tuple[float, float, dict[str, Any]] | None = None

    def snapshot(self, now: datetime) -> dict[str, Any]:
        with self._lock:
            cached = self._cached
            if cached is not None and time.monotonic() - cached[0] < cached[1]:
                return cached[2]
            payload = self._fetch(now)
            ttl = _ERROR_TTL_SECONDS if _has_error(payload) else _SUCCESS_TTL_SECONDS
            self._cached = (time.monotonic(), ttl, payload)
            return payload

    def _fetch(self, now: datetime) -> dict[str, Any]:
        start, end = _reporting_range(now)
        account, account_error = _load_service_account(self._settings.google_service_account_json)
        base = {
            "error": account_error,
            "account_email": account.get("client_email") if account else None,
            "range_start": start,
            "range_end": end,
            "fetched_at": _as_utc(now).isoformat(),
        }
        if account is None:
            empty = _channel(False, None)
            return {**base, "analytics": empty, "search_console": empty, "ads": empty}
        try:
            with httpx.Client(timeout=12.0) as http:
                token = _access_token(http, account)
        except Exception as exc:
            message = _public_error(exc)
            failed = _channel(False, None)
            return {**base, "error": message, "analytics": failed, "search_console": failed, "ads": failed}
        with ThreadPoolExecutor(max_workers=3) as pool:
            analytics_task = pool.submit(self._in_client, self._analytics, token, start, end)
            search_task = pool.submit(self._in_client, self._search_console, token, start, end)
            ads_task = pool.submit(self._in_client, self._ads, token, start, end)
            return {
                **base,
                "analytics": analytics_task.result(),
                "search_console": search_task.result(),
                "ads": ads_task.result(),
            }

    def _in_client(self, method: Any, token: str, start: str, end: str) -> dict[str, Any]:
        try:
            with httpx.Client(timeout=12.0) as http:
                return method(http, token, start, end)
        except Exception as exc:
            return _channel(True, _public_error(exc))

    def _analytics(self, http: httpx.Client, token: str, start: str, end: str) -> dict[str, Any]:
        property_id, property_error = _property_id(self._settings.google_analytics_property_id)
        if property_error:
            return _channel(False, property_error)
        url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
        headers = {"Authorization": f"Bearer {token}"}
        date_range = [{"startDate": start, "endDate": end}]
        try:
            totals = _post(
                http,
                url,
                headers,
                {
                    "dateRanges": date_range,
                    "metrics": [
                        {"name": "sessions"},
                        {"name": "screenPageViews"},
                        {"name": "totalUsers"},
                    ],
                },
            )
            countries = _post(
                http,
                url,
                headers,
                {
                    "dateRanges": date_range,
                    "dimensions": [{"name": "country"}],
                    "metrics": [{"name": "sessions"}, {"name": "screenPageViews"}],
                    "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
                    "limit": _ROW_LIMIT,
                },
            )
        except Exception as exc:
            return _channel(True, _public_error(exc))
        summed = _sum_metric_rows(totals)
        return _channel(
            True,
            None,
            sessions=summed.get("sessions", 0),
            pageviews=summed.get("screenPageViews", 0),
            users=summed.get("totalUsers", 0),
            countries=_ranked_from_report(countries, ("sessions", "screenPageViews")),
        )

    def _search_console(self, http: httpx.Client, token: str, start: str, end: str) -> dict[str, Any]:
        site = self._settings.google_search_console_site_url.strip()
        if not site:
            return _channel(
                False,
                "Set GOOGLE_SEARCH_CONSOLE_SITE_URL, for example https://www.retropokedex.com/ or sc-domain:retropokedex.com.",
            )
        url = (
            "https://searchconsole.googleapis.com/webmasters/v3/sites/"
            f"{quote(site, safe='')}/searchAnalytics/query"
        )
        headers = {"Authorization": f"Bearer {token}"}
        window = {"startDate": start, "endDate": end, "dataState": "all"}
        try:
            totals = _post(http, url, headers, {**window, "rowLimit": 1})
            terms = _post(http, url, headers, {**window, "dimensions": ["query"], "rowLimit": _ROW_LIMIT})
            countries = _post(http, url, headers, {**window, "dimensions": ["country"], "rowLimit": _ROW_LIMIT})
        except Exception as exc:
            return _channel(True, _public_error(exc))
        total_row = (totals.get("rows") or [{}])[0]
        return _channel(
            True,
            None,
            clicks=_as_int(total_row.get("clicks")),
            impressions=_as_int(total_row.get("impressions")),
            search_terms=_ranked_from_search(terms),
            countries=_ranked_from_search(countries, uppercase_label=True),
        )

    def _ads(self, http: httpx.Client, token: str, start: str, end: str) -> dict[str, Any]:
        customer = _digits(self._settings.google_ads_customer_id)
        developer_token = self._settings.google_ads_developer_token.strip()
        if not customer or not developer_token:
            return _channel(False, "Set GOOGLE_ADS_CUSTOMER_ID and GOOGLE_ADS_DEVELOPER_TOKEN.")
        version = self._settings.google_ads_api_version.strip() or "v25"
        url = f"https://googleads.googleapis.com/{version}/customers/{customer}/googleAds:search"
        headers = {
            "Authorization": f"Bearer {token}",
            "developer-token": developer_token,
        }
        login_customer = _digits(self._settings.google_ads_login_customer_id)
        if login_customer:
            headers["login-customer-id"] = login_customer
        date_filter = f"segments.date BETWEEN '{start}' AND '{end}'"
        try:
            totals = _post(
                http,
                url,
                headers,
                {
                    "query": (
                        "SELECT metrics.clicks, metrics.impressions "
                        f"FROM customer WHERE {date_filter}"
                    )
                },
            )
        except Exception as exc:
            return _channel(True, _public_error(exc))
        clicks, impressions = _sum_ads_metrics(totals)
        return _channel(
            True,
            None,
            clicks=clicks,
            impressions=impressions,
            search_terms=_optional_ads_rows(
                http,
                url,
                headers,
                (
                    "SELECT search_term_view.search_term, metrics.clicks, metrics.impressions "
                    f"FROM search_term_view WHERE {date_filter} "
                    "ORDER BY metrics.clicks DESC "
                    f"LIMIT {_ROW_LIMIT}"
                ),
                _ads_search_terms,
            ),
            countries=_ads_countries(http, url, headers, date_filter),
        )


def _ads_countries(http: httpx.Client, url: str, headers: dict[str, str], date_filter: str) -> list[dict[str, Any]]:
    rows = _optional_ads_rows(
        http,
        url,
        headers,
        (
            "SELECT geographic_view.country_criterion_id, metrics.clicks, metrics.impressions "
            f"FROM geographic_view WHERE {date_filter} "
            "ORDER BY metrics.clicks DESC "
            f"LIMIT {_ROW_LIMIT}"
        ),
        lambda payload: payload.get("results") or [],
    )
    if not rows:
        return []
    names = _country_names(http, url, headers, rows)
    ranked: list[dict[str, Any]] = []
    for row in rows:
        view = _mapping(row, "geographicView", "geographic_view")
        criterion_id = str(view.get("countryCriterionId") or view.get("country_criterion_id") or "")
        metrics = row.get("metrics") or {}
        ranked.append(
            _ranked(
                names.get(criterion_id, criterion_id or "Unknown"),
                clicks=_as_int(metrics.get("clicks")),
                impressions=_as_int(metrics.get("impressions")),
            )
        )
    return ranked


def _country_names(
    http: httpx.Client,
    url: str,
    headers: dict[str, str],
    rows: list[dict[str, Any]],
) -> dict[str, str]:
    ids = []
    for row in rows:
        view = _mapping(row, "geographicView", "geographic_view")
        criterion_id = str(view.get("countryCriterionId") or view.get("country_criterion_id") or "")
        if criterion_id.isdigit():
            ids.append(criterion_id)
    if not ids:
        return {}
    id_list = ", ".join(ids)
    try:
        payload = _post(
            http,
            url,
            headers,
            {
                "query": (
                    "SELECT geo_target_constant.id, geo_target_constant.canonical_name "
                    f"FROM geo_target_constant WHERE geo_target_constant.id IN ({id_list})"
                )
            },
        )
    except Exception:
        return {}
    names: dict[str, str] = {}
    for row in payload.get("results") or []:
        target = _mapping(row, "geoTargetConstant", "geo_target_constant")
        name = target.get("canonicalName") or target.get("canonical_name") or ""
        names[str(target.get("id") or "")] = str(name)
    return names


def _optional_ads_rows(
    http: httpx.Client,
    url: str,
    headers: dict[str, str],
    query: str,
    parse: Any,
) -> list[dict[str, Any]]:
    try:
        payload = _post(http, url, headers, {"query": query})
    except Exception:
        return []
    parsed = parse(payload)
    return parsed if isinstance(parsed, list) else []


def _ads_search_terms(payload: dict[str, Any]) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for row in payload.get("results") or []:
        view = _mapping(row, "searchTermView", "search_term_view")
        term = view.get("searchTerm") or view.get("search_term") or ""
        metrics = row.get("metrics") or {}
        if not term:
            continue
        ranked.append(
            _ranked(
                str(term),
                clicks=_as_int(metrics.get("clicks")),
                impressions=_as_int(metrics.get("impressions")),
            )
        )
    return ranked


def _sum_ads_metrics(payload: dict[str, Any]) -> tuple[int, int]:
    clicks = 0
    impressions = 0
    for row in payload.get("results") or []:
        metrics = row.get("metrics") or {}
        clicks += _as_int(metrics.get("clicks"))
        impressions += _as_int(metrics.get("impressions"))
    return clicks, impressions


def _access_token(http: httpx.Client, account: dict[str, Any]) -> str:
    try:
        from google.oauth2 import service_account
    except ImportError as exc:
        raise GoogleApiError("Install google-auth to load Google reports.") from exc
    credentials = service_account.Credentials.from_service_account_info(account, scopes=_SCOPES)
    credentials.refresh(_HttpxAuthRequest(http))
    token = credentials.token
    if not token:
        raise GoogleApiError("Google did not return an access token.")
    return str(token)


def _load_service_account(raw: str) -> tuple[dict[str, Any] | None, str | None]:
    text = raw.strip()
    if not text:
        return None, (
            "Add GOOGLE_SERVICE_ACCOUNT_JSON (a one-line key, or a path to the file). "
            "Invite that account on Analytics, Search Console, and Ads."
        )
    try:
        if text.startswith("{"):
            loaded = json.loads(text)
        else:
            loaded = json.loads(Path(text).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None, "Could not read GOOGLE_SERVICE_ACCOUNT_JSON."
    if not isinstance(loaded, dict) or not loaded.get("client_email") or not loaded.get("private_key"):
        return None, "GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key."
    return loaded, None


def _property_id(raw: str) -> tuple[str, str | None]:
    text = raw.strip()
    if text.lower().startswith("properties/"):
        text = text.split("/", 1)[1]
    if not text:
        return "", "Set GOOGLE_ANALYTICS_PROPERTY_ID to the numeric GA4 property id."
    if text.upper().startswith("G-"):
        return "", "GOOGLE_ANALYTICS_PROPERTY_ID must be the numeric property id, not the G- measurement id."
    if not text.isdigit():
        return "", "GOOGLE_ANALYTICS_PROPERTY_ID must be the numeric GA4 property id."
    return text, None


def _post(http: httpx.Client, url: str, headers: dict[str, str], body: dict[str, Any]) -> dict[str, Any]:
    response = http.post(url, headers={**headers, "Content-Type": "application/json"}, json=body)
    if response.status_code >= 400:
        raise GoogleApiError(_api_error(response))
    try:
        payload = response.json()
    except json.JSONDecodeError as exc:
        raise GoogleApiError("Google returned an unexpected response.") from exc
    if not isinstance(payload, dict):
        raise GoogleApiError("Google returned an unexpected response.")
    if isinstance(payload.get("error"), dict):
        message = payload["error"].get("message")
        raise GoogleApiError(str(message or "Google rejected the request."))
    return payload


def _api_error(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return f"Google returned HTTP {response.status_code}."
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict) and error.get("message"):
        return str(error["message"])[:300]
    return f"Google returned HTTP {response.status_code}."


def _sum_metric_rows(report: dict[str, Any]) -> dict[str, int]:
    headers = [str(item.get("name")) for item in report.get("metricHeaders") or []]
    totals = {name: 0 for name in headers}
    for row in report.get("rows") or []:
        values = row.get("metricValues") or []
        for index, name in enumerate(headers):
            if index < len(values):
                totals[name] += _as_int(values[index].get("value"))
    return totals


def _ranked_from_report(report: dict[str, Any], metric_names: tuple[str, ...]) -> list[dict[str, Any]]:
    headers = [str(item.get("name")) for item in report.get("metricHeaders") or []]
    ranked: list[dict[str, Any]] = []
    for row in report.get("rows") or []:
        label = str(((row.get("dimensionValues") or [{}])[0]).get("value") or "Unknown")
        values = row.get("metricValues") or []
        metrics = {
            name: _as_int(values[index].get("value")) if index < len(values) else 0
            for index, name in enumerate(headers)
        }
        ranked.append(
            _ranked(
                label,
                sessions=metrics.get("sessions", 0) if "sessions" in metric_names else 0,
                pageviews=metrics.get("screenPageViews", 0) if "screenPageViews" in metric_names else 0,
            )
        )
    return ranked


def _ranked_from_search(report: dict[str, Any], *, uppercase_label: bool = False) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for row in report.get("rows") or []:
        label = str((row.get("keys") or ["Unknown"])[0])
        if uppercase_label:
            label = label.upper()
        ranked.append(
            _ranked(
                label,
                clicks=_as_int(row.get("clicks")),
                impressions=_as_int(row.get("impressions")),
            )
        )
    return ranked


def _ranked(
    label: str,
    *,
    clicks: int = 0,
    impressions: int = 0,
    sessions: int = 0,
    pageviews: int = 0,
) -> dict[str, Any]:
    return {
        "label": label,
        "clicks": clicks,
        "impressions": impressions,
        "sessions": sessions,
        "pageviews": pageviews,
    }


def _channel(connected: bool, error: str | None, **metrics: Any) -> dict[str, Any]:
    payload = {
        "connected": connected,
        "error": error,
        "clicks": 0,
        "impressions": 0,
        "sessions": 0,
        "pageviews": 0,
        "users": 0,
        "search_terms": [],
        "countries": [],
    }
    payload.update(metrics)
    return payload


def _as_utc(now: datetime) -> datetime:
    if now.tzinfo is None:
        return now.replace(tzinfo=timezone.utc)
    return now.astimezone(timezone.utc)


def _reporting_range(now: datetime) -> tuple[str, str]:
    end = (_as_utc(now) - timedelta(days=1)).date()
    start = end - timedelta(days=27)
    return start.isoformat(), end.isoformat()


def _mapping(row: dict[str, Any], camel: str, snake: str) -> dict[str, Any]:
    value = row.get(camel) or row.get(snake) or {}
    return value if isinstance(value, dict) else {}


def _digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def _as_int(value: object) -> int:
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _has_error(payload: dict[str, Any]) -> bool:
    if payload.get("error"):
        return True
    for name in ("analytics", "search_console", "ads"):
        channel = payload.get(name) or {}
        if channel.get("connected") and channel.get("error"):
            return True
    return False


def _public_error(exc: Exception) -> str:
    if isinstance(exc, GoogleApiError):
        message = str(exc).strip()
    else:
        message = "Could not load this Google source."
    lowered = message.lower()
    if any(secret in lowered for secret in ("bearer ", "private_key", "developer-token", "client_secret")):
        return "Could not load this Google source."
    return message[:300] or "Could not load this Google source."
