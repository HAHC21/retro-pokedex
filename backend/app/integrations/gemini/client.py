"""Gemini client for learnset-constrained moveset suggestions."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class GeminiUsage:
    prompt_tokens: int = 0
    candidates_tokens: int = 0
    thoughts_tokens: int = 0
    total_tokens: int = 0

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "GeminiUsage":
        meta = payload.get("usageMetadata") or {}
        prompt = int(meta.get("promptTokenCount") or 0)
        candidates = int(meta.get("candidatesTokenCount") or 0)
        thoughts = int(meta.get("thoughtsTokenCount") or 0)
        total = int(meta.get("totalTokenCount") or 0)
        if total <= 0:
            total = prompt + candidates + thoughts
        return cls(
            prompt_tokens=prompt,
            candidates_tokens=candidates,
            thoughts_tokens=thoughts,
            total_tokens=total,
        )


@dataclass(frozen=True)
class GeminiTextResult:
    text: str
    usage: GeminiUsage
    model: str


class GeminiMovesetClient:
    """Calls Gemini generateContent; returns parsed JSON or raises."""

    # Prefer Flash-Lite for throughput; fall back across 3.x Flash / Lite ids.
    FALLBACK_MODELS = (
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
    )

    def __init__(
        self,
        *,
        api_key: str,
        model: str = "gemini-3.5-flash-lite",
        timeout_seconds: float = 45.0,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._resolved_model = model
        self._http = httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True)

    @property
    def available(self) -> bool:
        return bool(self._api_key.strip())

    @property
    def provider_label(self) -> str:
        return f"Google Gemini ({self._resolved_model})"

    async def suggest_movesets(
        self,
        *,
        pokemon_name: str,
        game_key: str,
        game_label: str,
        generation: int | None,
        types: list[str],
        allowed_moves: list[str],
    ) -> list[dict[str, Any]]:
        if not self.available:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        type_list = "/".join(types) if types else "unknown"
        gen_line = f"Generation {generation}" if generation else "unknown generation"
        move_lines = "\n".join(f"- {move}" for move in allowed_moves)
        later_mechanics = _later_mechanics_ban(generation)
        prompt = f"""You are a Pokémon battling assistant for a Pokédex app.

Selected game: {game_label} ({gen_line}, save key "{game_key}")
Pokémon: {pokemon_name}
Types: {type_list}

The following list is the COMPLETE set of moves this Pokémon can learn in {game_label}.
You MUST build every moveset using ONLY these exact move names:

{move_lines}

HARD RULES:
- Stay inside {game_label} / {gen_line} only.
- Every move must be copied exactly from the allowlist above (spelling and capitalization).
- Exactly 4 moves per set.
- Do not invent moves, and do not use moves from other games or generations.
- Do not mention held items, abilities, natures, EVs, or held-item strategies.
{later_mechanics}- Write a longer summary (2–4 sentences) explaining what this moveset lets the Pokémon do in {game_label}, covering offense, defense/support, and how the moves work together.

Respond with JSON only:
{{
  "sets": [
    {{
      "name": "short set name",
      "moves": ["Move A", "Move B", "Move C", "Move D"],
      "summary": "2–4 sentences on what this moveset lets the Pokémon do in {game_label}"
    }}
  ]
}}
"""
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.4,
                "responseMimeType": "application/json",
            },
        }
        candidates = [self._model, *[m for m in self.FALLBACK_MODELS if m != self._model]]
        last_error: Exception | None = None
        for model in candidates:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                response = await self._http.post(
                    url,
                    json=body,
                    headers={"x-goog-api-key": self._api_key},
                )
                if response.status_code == 404:
                    last_error = RuntimeError(f"Model not found: {model}")
                    continue
                response.raise_for_status()
                data = response.json()
                text = _extract_text(data)
                parsed = json.loads(_strip_fence(text))
                sets = parsed.get("sets") if isinstance(parsed, dict) else None
                if not isinstance(sets, list):
                    return []
                self._resolved_model = model
                return [item for item in sets if isinstance(item, dict)]
            except httpx.HTTPStatusError as exc:
                last_error = RuntimeError(
                    f"Gemini HTTP {exc.response.status_code} for model {model}"
                )
                if exc.response is not None and exc.response.status_code in {404, 429}:
                    continue
                raise last_error from exc
            except (json.JSONDecodeError, RuntimeError, KeyError, TypeError, ValueError) as exc:
                last_error = exc
                continue
        raise RuntimeError(
            f"No working Gemini model found (tried {', '.join(candidates)}). "
            f"Last error: {last_error}"
        )

    async def generate_text(self, prompt: str, *, temperature: float = 0.55) -> GeminiTextResult:
        """Plain-text generation with the same model fallback chain as movesets."""
        if not self.available:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
            },
        }
        candidates = [self._model, *[m for m in self.FALLBACK_MODELS if m != self._model]]
        last_error: Exception | None = None
        for model in candidates:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                response = await self._http.post(
                    url,
                    json=body,
                    headers={"x-goog-api-key": self._api_key},
                )
                if response.status_code == 404:
                    last_error = RuntimeError(f"Model not found: {model}")
                    continue
                if response.status_code == 429:
                    last_error = RuntimeError(f"Rate limited for model: {model}")
                    continue
                response.raise_for_status()
                payload = response.json()
                text = _extract_text(payload).strip()
                if not text:
                    last_error = RuntimeError(f"Empty response from {model}")
                    continue
                self._resolved_model = model
                return GeminiTextResult(
                    text=text,
                    usage=GeminiUsage.from_payload(payload),
                    model=model,
                )
            except httpx.HTTPStatusError as exc:
                last_error = RuntimeError(
                    f"Gemini HTTP {exc.response.status_code} for model {model}"
                )
                if exc.response is not None and exc.response.status_code in {404, 429}:
                    continue
                raise last_error from exc
            except RuntimeError as exc:
                last_error = exc
                continue
        raise RuntimeError(
            f"No working Gemini model found (tried {', '.join(candidates)}). "
            f"Last error: {last_error}"
        )

    async def aclose(self) -> None:
        await self._http.aclose()


def _later_mechanics_ban(generation: int | None) -> str:
    if generation is None:
        return ""
    bans: list[str] = []
    if generation < 6:
        bans.append("Mega Evolution / Mega Stones")
    if generation < 7:
        bans.append("Z-Moves / Z-Crystals")
    if generation < 8:
        bans.append("Dynamax / Gigantamax")
    if generation < 9:
        bans.append("Terastallization")
    if not bans:
        return ""
    return f"- Do not reference later-generation mechanics such as {', '.join(bans)}.\n"


def _extract_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = (((candidates[0] or {}).get("content") or {}).get("parts")) or []
    chunks = [str(part.get("text") or "") for part in parts if isinstance(part, dict)]
    text = "\n".join(chunks).strip()
    if not text:
        raise RuntimeError("Gemini returned empty text")
    return text


def _strip_fence(text: str) -> str:
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text.strip())
    return fence.group(1) if fence else text
