from typing import Self

from pydantic import BaseModel

from app.domain.region import Region


class RegionRead(BaseModel):
    slug: str
    name: str
    subtitle: str

    @classmethod
    def from_domain(cls, region: Region) -> Self:
        return cls(slug=region.slug, name=region.name, subtitle=region.subtitle)


class RegionProgressRead(RegionRead):
    total: int
    caught: int


class DashboardRead(BaseModel):
    caught: int
    total: int
    regions: list[RegionProgressRead]
