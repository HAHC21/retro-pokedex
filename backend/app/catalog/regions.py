from app.domain.region import Region

HISUI_SPECIES_IDS = tuple(range(899, 906))
SKIP_FORM_TOKENS = frozenset({"totem", "gmax", "mega", "cap", "starter"})

REGIONS = (
    Region(slug="kanto", name="Kanto", subtitle="Generation 1", generation=1),
    Region(slug="johto", name="Johto", subtitle="Generation 2", generation=2),
    Region(slug="hoenn", name="Hoenn", subtitle="Generation 3", generation=3),
    Region(slug="sinnoh", name="Sinnoh", subtitle="Generation 4", generation=4),
    Region(slug="unova", name="Unova", subtitle="Generation 5", generation=5),
    Region(slug="kalos", name="Kalos", subtitle="Generation 6", generation=6),
    Region(slug="alola", name="Alola", subtitle="Generation 7", generation=7, form_markers=("alola",)),
    Region(
        slug="galar",
        name="Galar",
        subtitle="Generation 8",
        generation=8,
        form_markers=("galar",),
        excluded_species_ids=HISUI_SPECIES_IDS,
    ),
    Region(
        slug="hisui",
        name="Hisui",
        subtitle="Legends: Arceus",
        form_markers=("hisui",),
        extra_species_ids=HISUI_SPECIES_IDS,
    ),
    Region(slug="paldea", name="Paldea", subtitle="Generation 9", generation=9, form_markers=("paldea",)),
)

DEFAULT_REGION_SLUG = REGIONS[0].slug

_REGIONS_BY_SLUG = {region.slug: region for region in REGIONS}


def all_regions() -> tuple[Region, ...]:
    return REGIONS


def get_region(slug: str) -> Region | None:
    return _REGIONS_BY_SLUG.get(slug)


def is_exclusive_form(pokemon_name: str, markers: tuple[str, ...]) -> bool:
    if not markers:
        return False
    tokens = pokemon_name.split("-")
    if any(token in SKIP_FORM_TOKENS for token in tokens):
        return False
    return any(marker in tokens for marker in markers)
