"""Wild encounter list."""

from app.schemas.base import OpenModel


class VersionNameRead(OpenModel):
    name: str


class MethodRead(OpenModel):
    name: str = ""


class EncounterDetailRead(OpenModel):
    chance: int | None = None
    method: MethodRead | None = None


class VersionEncounterRead(OpenModel):
    version: VersionNameRead
    encounter_details: list[EncounterDetailRead] = []


class LocationAreaRead(OpenModel):
    name: str
    url: str = ""


class WildEncounterRead(OpenModel):
    location_area: LocationAreaRead
    version_details: list[VersionEncounterRead] = []
    loc: str | None = None
    region: str | None = None


class SpawnsRead(OpenModel):
    enc: list[WildEncounterRead] = []
