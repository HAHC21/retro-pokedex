"""How to get one species in one game."""

from app.schemas.base import OpenModel


class AcquisitionRead(OpenModel):
    text: str
    methods: list[str] = []
