"""Smogon and Gemini movesets."""

from app.schemas.base import OpenModel


class MovesetCardRead(OpenModel):
    name: str
    moves: list[str] = []
    notes: str | None = None
    source: str
    format: str | None = None
    role: str | None = None


class SmogonMovesetsRead(OpenModel):
    game: str
    pokemon_id: int
    species: str
    format: str | None = None
    attribution: str
    attribution_url: str
    sets: list[MovesetCardRead] = []
    formats_tried: list[str] = []


class AiMovesetsRead(OpenModel):
    game: str
    pokemon_id: int
    available: bool
    provider: str | None = None
    message: str | None = None
    sets: list[MovesetCardRead] = []
    cached: bool = False
