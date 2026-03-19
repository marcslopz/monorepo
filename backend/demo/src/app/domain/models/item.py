from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class Item(BaseModel):
    id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
