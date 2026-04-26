class DomainError(Exception):
    pass


class NotFoundError(DomainError):
    def __init__(self, resource: str, resource_id: str) -> None:
        self.resource = resource
        self.resource_id = resource_id
        super().__init__(f"{resource} with id '{resource_id}' not found")


class ValidationError(DomainError):
    pass


class AuthenticationError(DomainError):
    pass


class StockSearchUnavailableError(DomainError):
    pass


class ExternalServiceError(DomainError):
    pass


class LinkValidationError(DomainError):
    pass
