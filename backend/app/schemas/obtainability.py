"""Where a species can be obtained."""

from app.schemas.base import OpenModel


class ObtainMetaRead(OpenModel):
    versions: list[str] = []
    evolves_from: int | None = None


class ObtainIndexRead(OpenModel):
    count: int
    versions: dict[str, list[str]]
    evolves_from: dict[str, int | None]
