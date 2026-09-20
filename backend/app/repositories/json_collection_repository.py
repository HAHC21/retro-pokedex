import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.domain.collection import CaughtPokemon
from app.repositories.collection_repository import CollectionRepository


class JsonFileCollectionRepository(CollectionRepository):
    def __init__(self, file_path: str) -> None:
        self._path = Path(file_path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._write({})

    def list_all(self) -> list[CaughtPokemon]:
        return [self._to_domain(pokemon_id, raw) for pokemon_id, raw in self._read().items()]

    def get(self, pokemon_id: int) -> CaughtPokemon | None:
        raw = self._read().get(str(pokemon_id))
        if raw is None:
            return None
        return self._to_domain(str(pokemon_id), raw)

    def save(self, entry: CaughtPokemon) -> CaughtPokemon:
        data = self._read()
        data[str(entry.pokemon_id)] = {
            "caught_at": entry.caught_at.isoformat(),
            "normal": entry.normal,
            "shiny": entry.shiny,
        }
        self._write(data)
        return entry

    def remove(self, pokemon_id: int) -> bool:
        data = self._read()
        if str(pokemon_id) not in data:
            return False
        del data[str(pokemon_id)]
        self._write(data)
        return True

    def _read(self) -> dict[str, Any]:
        with self._path.open(encoding="utf-8") as file:
            return json.load(file)

    def _write(self, data: dict[str, Any]) -> None:
        with self._path.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

    @staticmethod
    def _to_domain(pokemon_id: str, raw: Any) -> CaughtPokemon:
        if isinstance(raw, str):
            return CaughtPokemon(
                pokemon_id=int(pokemon_id),
                caught_at=datetime.fromisoformat(raw),
                normal=True,
                shiny=False,
            )
        return CaughtPokemon(
            pokemon_id=int(pokemon_id),
            caught_at=datetime.fromisoformat(str(raw["caught_at"])),
            normal=bool(raw.get("normal", True)),
            shiny=bool(raw.get("shiny", False)),
        )
