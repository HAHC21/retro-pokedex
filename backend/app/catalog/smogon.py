"""Map save games to Smogon generation / format ids (data.pkmn.cc)."""

# Primary competitive singles format per generation.
GAME_SMOGON_GEN: dict[str, int] = {
    "rb": 1,
    "y": 1,
    "gs": 2,
    "c": 2,
    "rs": 3,
    "e": 3,
    "frlg": 3,
    "dp": 4,
    "pt": 4,
    "hgss": 4,
    "bw": 5,
    "b2w2": 5,
    "xy": 6,
    "oras": 6,
    "sm": 7,
    "usum": 7,
    "swsh": 8,
    "bdsp": 8,
    "pla": 8,
    "sv": 9,
    "home": 9,
}


def smogon_gen_for_game(game_key: str) -> int:
    return GAME_SMOGON_GEN.get(game_key, 9)


def smogon_format_ids(game_key: str) -> list[str]:
    """Preferred format files to try (OU first, then full-gen dump)."""
    gen = smogon_gen_for_game(game_key)
    formats = [f"gen{gen}ou"]
    if game_key == "bdsp":
        formats.insert(0, "gen8bdspou")
    formats.append(f"gen{gen}")
    return formats


def to_smogon_species_name(pokemon_slug: str) -> str:
    """PokéAPI slug → Smogon display name (e.g. rotom-wash → Rotom-Wash)."""
    if not pokemon_slug:
        return ""
    return "-".join(part[:1].upper() + part[1:] for part in pokemon_slug.split("-") if part)
