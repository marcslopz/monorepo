from datetime import datetime

from pydantic import BaseModel


class PriceHistory(BaseModel):
    id: int
    piso_id: int
    precio: int
    notas: str | None
    fecha: datetime

    model_config = {"from_attributes": True}
