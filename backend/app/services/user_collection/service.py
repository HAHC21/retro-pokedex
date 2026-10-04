"""Authenticated user collection (caught/shiny marks by game)."""

from __future__ import annotations

from typing import Any

from app.repositories.user_collection import UserCollectionRepository


class UserCollectionService:
    def __init__(self, repository: UserCollectionRepository | None = None) -> None:
        self._repo = repository or UserCollectionRepository()

    def get_progress(self, user_id: str) -> dict[str, dict[str, dict[str, Any]]]:
        return self._repo.list_progress(user_id)

    def replace_progress(self, user_id: str, progress: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
        return self._repo.replace_progress(user_id, progress)

    def merge_progress(self, user_id: str, progress: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
        return self._repo.merge_progress(user_id, progress)

    def upsert_mark(
        self,
        user_id: str,
        *,
        game: str,
        pokemon_id: int,
        form: str = "base",
        mark: dict[str, Any],
    ) -> dict[str, Any] | None:
        return self._repo.upsert_mark(
            user_id=user_id,
            game=game,
            pokemon_id=pokemon_id,
            form=form,
            caught=bool(mark.get("caught")),
            caught_at=mark.get("caughtAt"),
            caught_male=bool(mark.get("caughtMale")),
            caught_female=bool(mark.get("caughtFemale")),
            shiny=bool(mark.get("shiny")),
            shiny_at=mark.get("shinyAt"),
            shiny_male=bool(mark.get("shinyMale")),
            shiny_female=bool(mark.get("shinyFemale")),
        )
