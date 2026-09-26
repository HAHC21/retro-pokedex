"""Form slug stored on a Pokémon row. The Pokédex number is shared; this slug is the specificity."""

from __future__ import annotations

REGIONAL_NAMES = frozenset({"alola", "galar", "hisui", "paldea"})

# Varieties and pokemon-form slugs that are not separate catches.
# Battle-only transformations, totems, primals, ride modes, event costumes,
# and compound regional slugs (paldea-combat-breed) stay unrecognized.
UNTRACKED_SLUGS = frozenset(
    {
        "castform-sunny",
        "castform-rainy",
        "castform-snowy",
        "cherrim-sunshine",
        "darmanitan-zen",
        "darmanitan-galar-zen",
        "meloetta-pirouette",
        "aegislash-blade",
        "xerneas-active",
        "wishiwashi-school",
        "mimikyu-busted",
        "mimikyu-totem-disguised",
        "mimikyu-totem-busted",
        "zygarde-complete",
        "zygarde-10-power-construct",
        "zygarde-50-power-construct",
        "greninja-ash",
        "greninja-battle-bond",
        "necrozma-ultra",
        "cramorant-gulping",
        "cramorant-gorging",
        "eiscue-noice",
        "morpeko-hangry",
        "zacian-crowned",
        "zamazenta-crowned",
        "palafin-hero",
        "terapagos-terastal",
        "terapagos-stellar",
        "minior-red",
        "minior-orange",
        "minior-yellow",
        "minior-green",
        "minior-blue",
        "minior-indigo",
        "minior-violet",
        "arceus-unknown",
        "koraidon-limited-build",
        "koraidon-sprinting-build",
        "koraidon-swimming-build",
        "koraidon-gliding-build",
        "miraidon-low-power-mode",
        "miraidon-drive-mode",
        "miraidon-aquatic-mode",
        "miraidon-glide-mode",
        "eternatus-eternamax",
        "pikachu-rock-star",
        "pikachu-belle",
        "pikachu-pop-star",
        "pikachu-phd",
        "pikachu-libre",
        "pikachu-cosplay",
        "pikachu-original-cap",
        "pikachu-hoenn-cap",
        "pikachu-sinnoh-cap",
        "pikachu-unova-cap",
        "pikachu-kalos-cap",
        "pikachu-alola-cap",
        "pikachu-partner-cap",
        "pikachu-world-cap",
        "pikachu-starter",
        "eevee-starter",
        "kyogre-primal",
        "groudon-primal",
    }
)

_SKIP_TOKENS = frozenset({"totem", "primal", "eternamax", "starter", "cap"})


def can_capture(form: str) -> bool:
    """Base species, regional forms, and other variants can be caught. Mega and Gigantamax cannot."""
    key = form.strip().lower()
    if key == "gigantamax" or key == "mega" or key.startswith("mega-"):
        return False
    return True


def is_untracked_slug(pokemon_slug: str) -> bool:
    """True when this variety is a battle transform, totem, primal, ride mode, or costume."""
    slug = pokemon_slug.lower()
    if slug in UNTRACKED_SLUGS:
        return True
    tokens = set(slug.split("-"))
    return bool(tokens & _SKIP_TOKENS)


def form_key(pokemon_slug: str, species_slug: str, *, is_default: bool = False) -> str | None:
    """Return base, mega, mega-x, regional-alola, gigantamax, variant-yellow, or None when untracked.

    ``is_default`` keeps the species' default variety on ``base`` even when its slug
    carries a form suffix (``minior-red-meteor``).
    """
    slug = pokemon_slug.lower()
    species = species_slug.lower()
    if is_default or (species and slug == species):
        return "base"
    prefix = f"{species}-"
    if not species or not slug.startswith(prefix):
        return None
    suffix = slug[len(prefix) :]
    if not suffix:
        return None
    if suffix == "gmax":
        return "gigantamax"
    if "gmax" in suffix.split("-"):
        return None
    if suffix == "mega" or suffix.startswith("mega-"):
        return suffix
    if "mega" in suffix.split("-"):
        return None
    if suffix in REGIONAL_NAMES:
        return f"regional-{suffix}"
    if any(part in REGIONAL_NAMES for part in suffix.split("-")):
        return None
    if is_untracked_slug(slug):
        return None
    return f"variant-{suffix}"


def variant_display_name(species_name: str, form: str) -> str:
    """``variant-yellow`` + Floette → ``Yellow Floette``."""
    suffix = form.removeprefix("variant-")
    label = " ".join(part[:1].upper() + part[1:] for part in suffix.split("-") if part)
    return f"{label} {species_name}".strip()
