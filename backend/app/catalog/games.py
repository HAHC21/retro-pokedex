from collections.abc import Iterable

VERSION_GROUP_LABELS = {
    "red-blue": "Red / Blue",
    "yellow": "Yellow",
    "gold-silver": "Gold / Silver",
    "crystal": "Crystal",
    "ruby-sapphire": "Ruby / Sapphire",
    "emerald": "Emerald",
    "firered-leafgreen": "FireRed / LeafGreen",
    "diamond-pearl": "Diamond / Pearl",
    "platinum": "Platinum",
    "heartgold-soulsilver": "HeartGold / SoulSilver",
    "black-white": "Black / White",
    "colosseum": "Colosseum",
    "xd": "XD: Gale of Darkness",
    "black-2-white-2": "Black 2 / White 2",
    "x-y": "X / Y",
    "omega-ruby-alpha-sapphire": "Omega Ruby / Alpha Sapphire",
    "sun-moon": "Sun / Moon",
    "ultra-sun-ultra-moon": "Ultra Sun / Ultra Moon",
    "lets-go-pikachu-lets-go-eevee": "Let's Go Pikachu / Let's Go Eevee",
    "sword-shield": "Sword / Shield",
    "the-isle-of-armor": "Isle of Armor",
    "the-crown-tundra": "Crown Tundra",
    "brilliant-diamond-shining-pearl": "Brilliant Diamond / Shining Pearl",
    "legends-arceus": "Legends: Arceus",
    "scarlet-violet": "Scarlet / Violet",
    "the-teal-mask": "The Teal Mask",
    "the-indigo-disk": "The Indigo Disk",
    "red-green-japan": "Red / Green (Japan)",
    "blue-japan": "Blue (Japan)",
    "legends-za": "Legends: Z-A",
    "mega-dimension": "Mega Dimension",
    "champions": "Champions",
}


def display_version_group(slug: str) -> str:
    return VERSION_GROUP_LABELS.get(slug, slug.replace("-", " ").title())


def display_generation(slug: str | None) -> str | None:
    if not slug:
        return None
    numeral = slug.removeprefix("generation-").upper()
    return f"Generation {numeral}"


SKIP_VERSION_GROUPS = frozenset({"red-green-japan", "blue-japan"})


def labeled_version_groups(slugs: Iterable[str]) -> list[str]:
    return [display_version_group(slug) for slug in slugs if slug not in SKIP_VERSION_GROUPS]
