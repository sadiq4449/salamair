"""Validate uploads using declared MIME + magic-byte sniffing (reduces RCE / polyglot risk)."""

from __future__ import annotations

import zipfile
from io import BytesIO

_DISALLOWED_MARKERS = (
    b"<?php",
    b"<%",
    b"<script",
)


def _normalize_declared_mime(raw: str | None) -> str:
    if not raw:
        return ""
    return raw.split(";", 1)[0].strip().lower()


def _reject_script_like_snippets(content: bytes) -> None:
    head = content[:65536].lower()
    for m in _DISALLOWED_MARKERS:
        if m in head:
            raise ValueError("File content is not allowed for security reasons")


def _sniff_image_or_pdf(content: bytes) -> str | None:
    if len(content) >= 3 and content[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(content) >= 8 and content[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(content) >= 6 and content[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    if content.startswith(b"%PDF"):
        return "application/pdf"
    return None


def _is_zip_ooxml(content: bytes) -> bool:
    if len(content) < 4 or content[:2] != b"PK":
        return False
    try:
        return zipfile.is_zipfile(BytesIO(content))
    except Exception:
        return False


def _ooxml_kind(content: bytes) -> str | None:
    """Return spreadsheet | wordprocessing | presentation | None."""
    if not _is_zip_ooxml(content):
        return None
    try:
        with zipfile.ZipFile(BytesIO(content)) as zf:
            names = set(zf.namelist())
    except zipfile.BadZipFile:
        return None
    if any(n.startswith("xl/") for n in names) or "xl/workbook.xml" in names:
        return "spreadsheet"
    if "word/document.xml" in names or any(n.startswith("word/") for n in names):
        return "wordprocessing"
    if any(n.startswith("ppt/") for n in names):
        return "presentation"
    return None


def _normalize_plaintext(content: bytes) -> None:
    _reject_script_like_snippets(content)
    # Heuristic: reject obvious binary uploads labeled as text.
    sample = content[:4096]
    if not sample:
        raise ValueError("Empty file")
    if b"\x00" in sample:
        raise ValueError("Invalid text file")


def validate_bulk_xlsx_bytes(content: bytes) -> None:
    """Strict check for bulk fare upload (OpenXML .xlsx only)."""
    if len(content) < 64:
        raise ValueError("File is too small to be a valid Excel workbook")
    if not _is_zip_ooxml(content):
        raise ValueError("Bulk upload must be a valid .xlsx (Excel) file")
    kind = _ooxml_kind(content)
    if kind != "spreadsheet":
        raise ValueError("Bulk upload must be an Excel spreadsheet (.xlsx), not Word or PowerPoint")


_CANONICAL_BY_KIND = {
    "spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "wordprocessing": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "presentation": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}


def validate_portal_attachment_bytes(content: bytes, declared_mime: str | None) -> str:
    """
    Validate request/chat attachments. Returns the canonical MIME type to persist.
    Raises ValueError when validation fails.
    """
    if not content:
        raise ValueError("Empty file")
    if len(content) > 256 * 1024 * 1024:
        raise ValueError("File is too large")

    declared = _normalize_declared_mime(declared_mime)
    sniff = _sniff_image_or_pdf(content)
    if sniff:
        _reject_script_like_snippets(content[:65536])
        if sniff.startswith("image/"):
            if declared in ("", "application/octet-stream"):
                return sniff
            if declared in ("image/jpg", "image/pjpeg") and sniff == "image/jpeg":
                return sniff
            if declared.startswith("image/") and declared != sniff:
                raise ValueError("Image declared as a different type than the actual file contents")
            if not declared.startswith("image/"):
                raise ValueError("File contents are image data; declared MIME type is not allowed")
            return sniff
        if sniff == "application/pdf":
            if declared in ("", "application/octet-stream", "application/pdf"):
                return "application/pdf"
            if declared.startswith("image/"):
                raise ValueError("File contents are a PDF; declared MIME type is not allowed")
            raise ValueError("Declared MIME type does not match file contents")

    if declared in ("text/plain", "text/csv"):
        _normalize_plaintext(content)
        return declared

    if _is_zip_ooxml(content):
        kind = _ooxml_kind(content)
        if kind is None or kind not in _CANONICAL_BY_KIND:
            raise ValueError("Unrecognized Office document type")
        canonical = _CANONICAL_BY_KIND[kind]
        expected_declared = {
            "spreadsheet": (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ),
            "wordprocessing": (
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/msword",
            ),
            "presentation": (
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "application/vnd.ms-powerpoint",
            ),
        }[kind]
        if declared and declared not in ("application/octet-stream", *expected_declared):
            # Allow mismatch only when client sent no useful MIME (some browsers send octet-stream).
            if declared != "application/octet-stream":
                raise ValueError("Declared file type does not match an Office Open XML document")
        _reject_script_like_snippets(content[: min(len(content), 1024)])  # zip local header only
        return canonical

    raise ValueError(
        "Unsupported file type. Allowed: images (JPEG, PNG, GIF, WebP), PDF, plain text, CSV, "
        "Excel (.xlsx), Word (.docx), PowerPoint (.pptx)."
    )
