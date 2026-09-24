"""Form slug stored on a Pokémon row. The Pokédex number is shared; this slug is the specificity."""

from __future__ import annotations

REGIONAL_NAMES = frozenset({"alola", "galar", "hisui", "paldea"})

# Known values. Terastallization can be added later without a schema change.
# regional-* distinguishes Alolan Meowth from Galarian Meowth, which share a Pokédex number.


def can_capture(form: str) -> bool:
    """Base species and regional forms can be caught. Mega and Gigantamax cannot."""
    key = form.strip().lower()
    if key == "gigantamax" or key == "mega" or key.startswith("mega-"):
        return False
    return True


def form_key(pokemon_slug: str, species_slug: str) -> str | None:
    """Return base, mega, mega-x, regional-alola, gigantamax, or None when this variety is not tracked."""
    slug = pokemon_slug.lower()
    species = species_slug.lower()
    if species and slug == species:
        return "base"
    prefix = f"{species}-"
    if not species or not slug.startswith(prefix):
        return None
    suffix = slug[len(prefix) :]
    if suffix == "gmax":
        return "gigantamax"
    if suffix == "mega" or suffix.startswith("mega-"):
        return suffix
    if suffix in REGIONAL_NAMES:
        return f"regional-{suffix}"
    return None
