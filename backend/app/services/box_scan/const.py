from datetime import timedelta

SOURCES = {
    "home": "Pokémon HOME",
    "bank": "Pokémon Bank",
    "sv": "Pokémon Scarlet / Violet",
    "swsh": "Pokémon Sword / Shield",
    "switch2": "Nintendo Switch 2",
    "switch": "Nintendo Switch",
}

REGIONAL_FORMS = {
    "alola": "alola",
    "alolan": "alola",
    "galar": "galar",
    "galarian": "galar",
    "hisui": "hisui",
    "hisuian": "hisui",
    "paldea": "paldea",
    "paldean": "paldea",
}

SLOT_COUNT = 30
NEW_ACCOUNT_WINDOW = timedelta(hours=48)
DAY = timedelta(hours=24)
NEW_ACCOUNT_CAP = 1
DAILY_CAP = 2
DAILY_BUDGET_USD = 1.0
# TEMPORARY: pretend the shared daily budget is already spent so the scan page can be checked.
FORCE_GLOBAL_SCAN_LIMIT = False
# USD per 1M tokens. Output rate includes thinking tokens. Matches generate_overviews.py.
MODEL_PRICES_PER_M: dict[str, tuple[float, float]] = {
    "gemini-3.5-flash-lite": (0.30, 2.50),
    "gemini-3.6-flash-lite": (0.30, 2.50),
    "gemini-3.1-flash-lite": (0.25, 1.50),
    "gemini-3.6-flash": (1.50, 7.50),
    "gemini-3.5-flash": (1.50, 9.00),
}
DEFAULT_PRICE_PER_M = (0.30, 2.50)
# Used only when Gemini omits token counts, so a scan still counts toward the daily budget.
FALLBACK_SCAN_USD = 0.0022
NATIONAL_MAX_ID = 1025
