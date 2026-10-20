from pydantic import BaseModel, computed_field


class MessageResponse(BaseModel):
    message: str


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total: int
    offset: int
    limit: int

    @computed_field
    @property
    def has_more(self) -> bool:
        return self.offset + len(self.items) < self.total
