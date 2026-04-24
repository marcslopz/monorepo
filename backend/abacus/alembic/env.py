import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from abacus.infrastructure.persistence.database import Base, _build_engine_url

# Import all models so Alembic can detect them
import abacus.infrastructure.persistence.models  # noqa: F401

config = context.config
_db_url, _db_connect_args = _build_engine_url()
config.set_main_option("sqlalchemy.url", _db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema="abacus",
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: object) -> None:
    context.configure(
        connection=connection,  # type: ignore[arg-type]
        target_metadata=target_metadata,
        include_schemas=True,
        version_table_schema="abacus",
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(_db_url, connect_args=_db_connect_args)
    # Create the schema in a committed transaction before Alembic runs,
    # because Alembic needs the schema to exist to create its version table.
    async with connectable.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS abacus"))
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
