"""Filesystem layout for the backend (uploads, private storage)."""

from pathlib import Path

# app/core/paths.py → app → Backend
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent

# Legacy world-readable storage (no longer mounted publicly; kept for existing rows on disk).
LEGACY_UPLOAD_DIR = BACKEND_ROOT / "uploads"
LEGACY_CHAT_SUBDIR = LEGACY_UPLOAD_DIR / "chat"

# User uploads served only via authenticated download endpoints.
PRIVATE_UPLOAD_ROOT = BACKEND_ROOT / "private_uploads"
PRIVATE_REQUEST_FILES_DIR = PRIVATE_UPLOAD_ROOT / "requests"
PRIVATE_CHAT_FILES_DIR = PRIVATE_UPLOAD_ROOT / "chat"
