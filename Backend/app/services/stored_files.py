"""Resolve on-disk paths for stored request attachments (private store + legacy uploads)."""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status

from app.core.paths import LEGACY_UPLOAD_DIR, PRIVATE_REQUEST_FILES_DIR
from app.models.attachment import Attachment


def resolve_request_attachment_disk_path(att: Attachment) -> Path:
    """Return the path to bytes on disk for a request Attachment row."""
    new_path = PRIVATE_REQUEST_FILES_DIR / str(att.id)
    if new_path.is_file():
        return new_path
    url = att.file_url or ""
    if url.startswith("/uploads/"):
        legacy_name = url.rstrip("/").split("/")[-1]
        legacy_path = LEGACY_UPLOAD_DIR / legacy_name
        if legacy_path.is_file():
            return legacy_path
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error": {"code": "NOT_FOUND", "message": "Attachment file is no longer on disk"}},
    )
