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
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMP WITH TIME ZONE"
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
        # Performance indexes for frequently filtered/joined columns.
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_requests_agent_id ON requests (agent_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_requests_assigned_to ON requests (assigned_to)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_requests_status ON requests (status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_requests_priority ON requests (priority)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_requests_created_at ON requests (created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_counter_offers_request_id ON counter_offers (request_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_counter_offers_created_by ON counter_offers (created_by)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_counter_offers_status ON counter_offers (status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_counter_offers_created_at ON counter_offers (created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_request_history_request_id ON request_history (request_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_request_history_actor_id ON request_history (actor_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_request_history_created_at ON request_history (created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_attachments_request_id ON attachments (request_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_attachments_uploaded_at ON attachments (uploaded_at)"))
