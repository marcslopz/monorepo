from typing import Any, Literal

from pydantic import BaseModel


class ProgressEvent(BaseModel):
    type: Literal["progress"] = "progress"
    step: str
    message: str


class DoneEvent(BaseModel):
    type: Literal["done"] = "done"
    piso: dict[str, Any]


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    step: str
    message: str


SseEvent = ProgressEvent | DoneEvent | ErrorEvent
