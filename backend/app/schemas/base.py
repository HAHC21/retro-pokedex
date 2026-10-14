"""Pydantic models that keep fields the compiler adds beside the declared ones."""

from pydantic import BaseModel, ConfigDict


class OpenModel(BaseModel):
    model_config = ConfigDict(extra="allow")
