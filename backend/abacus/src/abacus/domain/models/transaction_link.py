import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class TransactionLink(BaseModel):
    id: uuid.UUID
    sell_id: uuid.UUID
    buy_id: uuid.UUID
    quantity: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}
