"""Seed rows for games, generations, and regions. The compile script copies these into Mongo."""

GENERATIONS: list[dict] = [
    {"id": 1, "roman": "I", "from": 1, "to": 151, "games": "Red · Blue · Yellow"},
    {"id": 2, "roman": "II", "from": 152, "to": 251, "games": "Gold · Silver · Crystal"},
    {"id": 3, "roman": "III", "from": 252, "to": 386, "games": "Ruby · Sapphire · Emerald · FR/LG"},
    {"id": 4, "roman": "IV", "from": 387, "to": 493, "games": "Diamond · Pearl · Platinum · HG/SS"},
    {"id": 5, "roman": "V", "from": 494, "to": 649, "games": "Black · White · B2/W2"},
    {"id": 6, "roman": "VI", "from": 650, "to": 721, "games": "X · Y · OR/AS"},
    {"id": 7, "roman": "VII", "from": 722, "to": 809, "games": "Sun · Moon · US/UM"},
    {"id": 8, "roman": "VIII", "from": 810, "to": 905, "games": "Sword · Shield · BD/SP · Legends Arceus"},
    {"id": 9, "roman": "IX", "from": 906, "to": 1025, "games": "Scarlet · Violet"},
]

REGIONS: list[dict] = [
    {"slug": "kanto", "name": "Kanto", "from": 1, "to": 151, "games": "Red · Blue · Yellow", "mascots": [144, 145, 146, 150]},
    {"slug": "johto", "name": "Johto", "from": 152, "to": 251, "games": "Gold · Silver · Crystal", "mascots": [243, 244, 245, 249, 250]},
    {"slug": "hoenn", "name": "Hoenn", "from": 252, "to": 386, "games": "Ruby · Sapphire · Emerald · FR/LG", "mascots": [382, 383, 384]},
    {"slug": "sinnoh", "name": "Sinnoh", "from": 387, "to": 493, "games": "Diamond · Pearl · Platinum", "mascots": [483, 484, 487]},
    {"slug": "unova", "name": "Unova", "from": 494, "to": 649, "games": "Black · White · B2/W2", "mascots": [643, 644, 646]},
    {"slug": "kalos", "name": "Kalos", "from": 650, "to": 721, "games": "X · Y", "mascots": [716, 717, 718]},
    {"slug": "alola", "name": "Alola", "from": 722, "to": 809, "games": "Sun · Moon · US/UM", "mascots": [791, 792, 800]},
    {"slug": "galar", "name": "Galar", "from": 810, "to": 898, "games": "Sword · Shield", "mascots": [888, 889, 890]},
    {"slug": "hisui", "name": "Hisui", "from": 899, "to": 905, "games": "Legends: Arceus", "mascots": [905]},
    {"slug": "paldea", "name": "Paldea", "from": 906, "to": 1025, "games": "Scarlet · Violet", "mascots": [1007, 1008]},
]

# versions None and version_groups None mean every version (Pokémon HOME).
GAMES: list[dict] = [
    {"key": "rb", "label": "Red / Blue", "generation": 1, "versions": ["red", "blue"], "pokedexes": ["kanto"], "version_groups": ["red-blue"]},
    {"key": "y", "label": "Yellow", "generation": 1, "versions": ["yellow"], "pokedexes": ["kanto"], "version_groups": ["yellow"]},
    {"key": "gs", "label": "Gold / Silver", "generation": 2, "versions": ["gold", "silver"], "pokedexes": ["original-johto"], "version_groups": ["gold-silver"]},
    {"key": "c", "label": "Crystal", "generation": 2, "versions": ["crystal"], "pokedexes": ["updated-johto"], "version_groups": ["crystal"]},
    {"key": "rs", "label": "Ruby / Sapphire", "generation": 3, "versions": ["ruby", "sapphire"], "pokedexes": ["hoenn"], "version_groups": ["ruby-sapphire"]},
    {"key": "e", "label": "Emerald", "generation": 3, "versions": ["emerald"], "pokedexes": ["hoenn"], "version_groups": ["emerald"]},
    {"key": "frlg", "label": "FireRed / LeafGreen", "generation": 3, "versions": ["firered", "leafgreen"], "pokedexes": ["kanto"], "version_groups": ["firered-leafgreen"]},
    {"key": "dp", "label": "Diamond / Pearl", "generation": 4, "versions": ["diamond", "pearl"], "pokedexes": ["original-sinnoh"], "version_groups": ["diamond-pearl"]},
    {"key": "pt", "label": "Platinum", "generation": 4, "versions": ["platinum"], "pokedexes": ["extended-sinnoh"], "version_groups": ["platinum"]},
    {"key": "hgss", "label": "HeartGold / SoulSilver", "generation": 4, "versions": ["heartgold", "soulsilver"], "pokedexes": ["updated-johto"], "version_groups": ["heartgold-soulsilver"]},
    {"key": "bw", "label": "Black / White", "generation": 5, "versions": ["black", "white"], "pokedexes": ["original-unova"], "version_groups": ["black-white"]},
    {"key": "b2w2", "label": "Black 2 / White 2", "generation": 5, "versions": ["black-2", "white-2"], "pokedexes": ["updated-unova"], "version_groups": ["black-2-white-2"]},
    {"key": "xy", "label": "X / Y", "generation": 6, "versions": ["x", "y"], "pokedexes": ["kalos-central", "kalos-coastal", "kalos-mountain"], "version_groups": ["x-y"]},
    {"key": "oras", "label": "Omega Ruby / Alpha Sapphire", "generation": 6, "versions": ["omega-ruby", "alpha-sapphire"], "pokedexes": ["updated-hoenn"], "version_groups": ["omega-ruby-alpha-sapphire"]},
    {"key": "sm", "label": "Sun / Moon", "generation": 7, "versions": ["sun", "moon"], "pokedexes": ["original-alola"], "version_groups": ["sun-moon"]},
    {"key": "usum", "label": "Ultra Sun / Ultra Moon", "generation": 7, "versions": ["ultra-sun", "ultra-moon"], "pokedexes": ["updated-alola"], "version_groups": ["ultra-sun-ultra-moon"]},
    {"key": "swsh", "label": "Sword / Shield", "generation": 8, "versions": ["sword", "shield"], "pokedexes": ["galar", "isle-of-armor", "crown-tundra"], "version_groups": ["sword-shield", "the-isle-of-armor", "the-crown-tundra"]},
    {"key": "bdsp", "label": "Brilliant Diamond / Shining Pearl", "generation": 8, "versions": ["brilliant-diamond", "shining-pearl"], "pokedexes": ["original-sinnoh"], "version_groups": ["brilliant-diamond-shining-pearl"]},
    {"key": "pla", "label": "Legends: Arceus", "generation": 8, "versions": ["legends-arceus"], "pokedexes": ["hisui"], "version_groups": ["legends-arceus"]},
    {"key": "sv", "label": "Scarlet / Violet", "generation": 9, "versions": ["scarlet", "violet"], "pokedexes": ["paldea", "kitakami", "blueberry"], "version_groups": ["scarlet-violet", "the-teal-mask", "the-indigo-disk"]},
    {"key": "home", "label": "Pokémon HOME", "generation": None, "versions": None, "pokedexes": ["national"], "version_groups": None},
]
