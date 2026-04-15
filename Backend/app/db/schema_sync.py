"""Incremental DDL for existing databases.

SQLAlchemy ``create_all`` creates missing tables but does not add new columns to tables that
already existed (e.g. Railway Postgres from before a model change).
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine


def apply_runtime_schema_fixes(engine: Engine) -> None:
    dialect = engine.dialect.name
    if dialect != "postgresql":
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE"
            )
        )
