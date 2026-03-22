class DomainError(Exception):
    """Base class for domain errors."""


class NotFoundError(DomainError):
    def __init__(self, entity: str, entity_id: str) -> None:
        self.entity = entity
        self.entity_id = entity_id
        super().__init__(f"{entity} with id '{entity_id}' not found")


class ValidationError(DomainError):
    """Raised when domain validation fails."""


class ConflictError(DomainError):
    def __init__(self, entity: str, field: str, value: str) -> None:
        self.entity = entity
        self.field = field
        self.value = value
        super().__init__(f"{entity} with {field}='{value}' already exists")
