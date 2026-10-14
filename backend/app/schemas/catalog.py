"""Catalog, form list, and regional dex."""

from pydantic import Field

from app.schemas.base import OpenModel


class GenerationRead(OpenModel):
    id: int
    roman: str
    national_from: int = Field(alias="from")
    national_to: int = Field(alias="to")
    games: str


class RegionRead(OpenModel):
    slug: str
    name: str
    national_from: int = Field(alias="from")
    national_to: int = Field(alias="to")
    games: str
    mascots: list[int] = []


class CatalogRead(OpenModel):
    names: dict[str, str]
    types: dict[str, list[str]]
    legendaries: list[int]
    mythicals: list[int]
    pseudos: list[int]
    fossils: list[int]
    starters: list[int]
    count: int
    generations: list[GenerationRead]
    regions: list[RegionRead]


class FormRowRead(OpenModel):
    pokedex_id: int
    form: str
    name: str | None = None
    resource_id: int
    types: list[str] = []
    capture: bool = True
    sprite_form: str | None = None


class FormsRead(OpenModel):
    forms: list[FormRowRead]


class RegionalEntryRead(OpenModel):
    id: int
    number: int


class RegionalDexRead(OpenModel):
    game: str
    entries: list[RegionalEntryRead]
    ids: list[int]
