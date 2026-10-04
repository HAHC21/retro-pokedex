import re



NOT_WILD = re.compile(r"gift|only-one|trade|starter|squirt-bottle|wailmer-pail")

POKECENTER = re.compile(r"pokecenter|poke-center")

_NAMED_REQUIREMENT_KEYS = (
    "item",
    "held_item",
    "known_move",
    "known_move_type",
    "location",
    "party_species",
    "party_type",
    "trade_species",
)

# Walking, rustling grass, and flower spots stay "Wild Encounter".
# Anything else in the wild bucket is a tool or rod the player has to use.
ORDINARY_WILD = {
    "walk",
    "dark-grass",
    "grass-spots",
    "yellow-flowers",
    "purple-flowers",
    "red-flowers",
    "rough-terrain",
}

ROD_LABELS = {
    "old-rod": "Old Rod",
    "good-rod": "Good Rod",
    "super-rod": "Super Rod",
}

FIELD_LABELS = {
    "rock-smash": "Rock Smash",
    "headbutt": "Headbutt",
    "waterfall": "Waterfall",
    "whirlpool": "Whirlpool",
    "honey": "Honey",
    "seaweed": "Seaweed",
    "squirt-bottle": "Squirt Bottle",
    "wailmer-pail": "Wailmer Pail",
    "pokeflute": "Poké Flute",
}

SPECIAL_ORDER = (
    "old-rod",
    "good-rod",
    "super-rod",
    "rock-smash",
    "headbutt",
    "surf",
    "dive",
    "waterfall",
    "whirlpool",
    "honey",
    "seaweed",
    "squirt-bottle",
    "wailmer-pail",
    "pokeflute",
)

REGION_PREFIX = re.compile(
    r"^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea|hisui|kitakami|blueberry)-"
)
