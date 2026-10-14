"""Moves a species can learn in one game."""

from app.schemas.base import OpenModel


class LearnsetMoveRead(OpenModel):
    id: int
    name: str
    level: int = 0
    type: str | None = None
    damage_class: str | None = None
    power: int | None = None
    accuracy: int | None = None
    pp: int | None = None
    priority: int = 0


class LearnsetGroupRead(OpenModel):
    method: str
    label: str
    moves: list[LearnsetMoveRead] = []


class LearnsetRead(OpenModel):
    game: str
    groups: list[LearnsetGroupRead] = []
    catalog_count: int = 0
