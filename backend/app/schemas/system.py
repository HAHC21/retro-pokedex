"""Process health and the API build id."""

from pydantic import BaseModel


class HealthRead(BaseModel):
    status: str


class VersionRead(BaseModel):
    version: str
