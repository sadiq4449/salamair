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
        # email_threads: one row per (request, channel) — add agent_sales thread alongside legacy RM thread.
        conn.execute(
            text(
                "ALTER TABLE email_threads ADD COLUMN IF NOT EXISTS thread_channel VARCHAR(32) NOT NULL DEFAULT 'rm'"
            )
        )
        conn.execute(
            text("UPDATE email_threads SET thread_channel = 'rm' WHERE thread_channel IS NULL OR thread_channel = ''")
        )
        # Drop both the named constraint AND the unique index that may exist under different names.
        conn.execute(text("ALTER TABLE email_threads DROP CONSTRAINT IF EXISTS email_threads_request_id_key"))
        conn.execute(text("DROP INDEX IF EXISTS ix_email_threads_request_id"))
        conn.execute(text("ALTER TABLE email_threads DROP CONSTRAINT IF EXISTS uq_email_threads_request_id"))
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'uq_email_threads_request_channel'
                    ) THEN
                        ALTER TABLE email_threads
                        ADD CONSTRAINT uq_email_threads_request_channel UNIQUE (request_id, thread_channel);
                    END IF;
                END
                $$;
                """
            )
        )
