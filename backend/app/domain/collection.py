from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CaughtPokemon:
    pokemon_id: int
    caught_at: datetime
    normal: bool = True
    shiny: bool = False

    @property
    def is_caught(self) -> bool:
        return self.normal or self.shiny
