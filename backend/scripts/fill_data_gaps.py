"""Manual gap fill. Uses PokéAPI only for rows the app has already recorded as missing.

Usage (from backend/ with venv active and MONGODB_URI set):

    python -m scripts.fill_data_gaps
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.poke_compile.fill import fill_open_gaps


def main() -> None:
    result = asyncio.run(fill_open_gaps())
    print(result["status"], f"open={result['open']}", f"resolved={result['resolved']}")


if __name__ == "__main__":
    main()
