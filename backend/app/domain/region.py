from dataclasses import dataclass


@dataclass(frozen=True)
class Region:
    slug: str
    name: str
    subtitle: str
    generation: int | None = None
    form_markers: tuple[str, ...] = ()
    extra_species_ids: tuple[int, ...] = ()
    excluded_species_ids: tuple[int, ...] = ()
