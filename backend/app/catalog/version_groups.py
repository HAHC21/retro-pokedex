"""Game save keys → PokéAPI version-group slugs (learnsets)."""

GAME_VERSION_GROUPS: dict[str, list[str]] = {
    "rb": ["red-blue"],
    "y": ["yellow"],
    "gs": ["gold-silver"],
    "c": ["crystal"],
    "rs": ["ruby-sapphire"],
    "e": ["emerald"],
    "frlg": ["firered-leafgreen"],
    "dp": ["diamond-pearl"],
    "pt": ["platinum"],
    "hgss": ["heartgold-soulsilver"],
    "bw": ["black-white"],
    "b2w2": ["black-2-white-2"],
    "xy": ["x-y"],
    "oras": ["omega-ruby-alpha-sapphire"],
    "sm": ["sun-moon"],
    "usum": ["ultra-sun-ultra-moon"],
    "swsh": ["sword-shield", "the-isle-of-armor", "the-crown-tundra"],
    "bdsp": ["brilliant-diamond-shining-pearl"],
    "pla": ["legends-arceus"],
    "sv": ["scarlet-violet", "the-teal-mask", "the-indigo-disk"],
    "home": [],
}

VERSION_GROUP_IDS: dict[str, int] = {
    "red-blue": 1,
    "yellow": 2,
    "gold-silver": 3,
    "crystal": 4,
    "ruby-sapphire": 5,
    "emerald": 6,
    "firered-leafgreen": 7,
    "diamond-pearl": 8,
    "platinum": 9,
    "heartgold-soulsilver": 10,
    "black-white": 11,
    "colosseum": 12,
    "xd": 13,
    "black-2-white-2": 14,
    "x-y": 15,
    "omega-ruby-alpha-sapphire": 16,
    "sun-moon": 17,
    "ultra-sun-ultra-moon": 18,
    "lets-go-pikachu-lets-go-eevee": 19,
    "sword-shield": 20,
    "the-isle-of-armor": 21,
    "the-crown-tundra": 22,
    "brilliant-diamond-shining-pearl": 23,
    "legends-arceus": 24,
    "scarlet-violet": 25,
    "the-teal-mask": 26,
    "the-indigo-disk": 27,
}

METHOD_LABELS: dict[str, tuple[str, int]] = {
    "level-up": ("Level up", 0),
    "machine": ("TM / HM / TR", 1),
    "egg": ("Breeding", 2),
    "tutor": ("Tutor", 3),
    "form-change": ("Form change", 4),
    "train": ("Train", 5),
}


def version_groups_for_game(game_key: str) -> list[str] | None:
    """None means all version groups (HOME)."""
    if game_key == "home":
        return None
    return list(GAME_VERSION_GROUPS.get(game_key) or [])
