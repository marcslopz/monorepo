import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from demo.infrastructure.persistence.repositories.sqlalchemy_item_repository import (
    SQLAlchemyItemRepository,
)


@pytest.mark.asyncio
async def test_create_and_get_item(db_session: AsyncSession) -> None:
    repo = SQLAlchemyItemRepository(db_session)

    item = await repo.create(name="Integration Item", description="Test")

    assert item.id is not None
    assert item.name == "Integration Item"
    assert item.description == "Test"

    fetched = await repo.get_by_id(item.id)
    assert fetched is not None
    assert fetched.id == item.id


@pytest.mark.asyncio
async def test_list_items(db_session: AsyncSession) -> None:
    repo = SQLAlchemyItemRepository(db_session)

    for i in range(3):
        await repo.create(name=f"List Item {i}")

    items = await repo.list_all(limit=10, offset=0)
    assert len(items) >= 3


@pytest.mark.asyncio
async def test_update_item(db_session: AsyncSession) -> None:
    repo = SQLAlchemyItemRepository(db_session)

    item = await repo.create(name="Original Name")
    updated = await repo.update(item.id, name="Updated Name", description=None)

    assert updated is not None
    assert updated.name == "Updated Name"


@pytest.mark.asyncio
async def test_delete_item(db_session: AsyncSession) -> None:
    repo = SQLAlchemyItemRepository(db_session)

    item = await repo.create(name="To Delete")
    deleted = await repo.delete(item.id)
    assert deleted is True

    fetched = await repo.get_by_id(item.id)
    assert fetched is None


@pytest.mark.asyncio
async def test_get_nonexistent_item(db_session: AsyncSession) -> None:
    import uuid

    repo = SQLAlchemyItemRepository(db_session)
    fetched = await repo.get_by_id(uuid.uuid4())
    assert fetched is None
