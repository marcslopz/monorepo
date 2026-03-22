from datetime import datetime

from pydantic import BaseModel


class Comment(BaseModel):
    id: int
    piso_id: int
    texto: str
    fecha: datetime

    model_config = {"from_attributes": True}
