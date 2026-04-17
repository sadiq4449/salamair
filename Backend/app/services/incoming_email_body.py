"""
Normalize RM reply bodies: clients quote the full previous HTML, so the same SmartDeal
template can appear many times. Strip quote headers and duplicate template blocks.
"""
from __future__ import annotations

import re


_REQ_DETAILS_LINE = re.compile(r"^\s*Request details\s*$", re.IGNORECASE)

# Common "beginning of quoted thread" markers (English clients)
_QUOTE_START_PATTERNS = [
    re.compile(r"\nOn .{1,400}?wrote:\s*\n", re.IGNORECASE | re.DOTALL),
    re.compile(r"\n-{5,}\s*Original Message\s*-{5,}\s*\n", re.IGNORECASE),
    re.compile(r"\nFrom:\s+[^\n]+\r?\nSent:\s+", re.IGNORECASE),
    re.compile(r"\n________________________________\r?\n"),
]


def sanitize_incoming_rm_body(text: str) -> str:
    """Shorten IMAP-captured incoming mail for display/storage (RM real reply only, not 20× quoted template)."""
    if not text or not text.strip():
        return text
    t = text.replace("\r\n", "\n").strip()
    t = _strip_after_standard_quote_headers(t)
    t = _strip_from_second_request_details_heading(t)
    t = _collapse_consecutive_duplicate_lines(t)
    return t.strip()


def _strip_after_standard_quote_headers(t: str) -> str:
    cut = len(t)
    for pat in _QUOTE_START_PATTERNS:
        m = pat.search(t)
        if m:
            cut = min(cut, m.start())
    head = t[:cut].strip()
    return head if head else t


def _strip_from_second_request_details_heading(t: str) -> str:
    """Portal template starts with 'Request details'; quoted thread repeats that heading many times."""
    lines = t.split("\n")
    hits: list[int] = []
    for i, line in enumerate(lines):
        if _REQ_DETAILS_LINE.match(line):
            hits.append(i)
    if len(hits) < 2:
        return t
    second = hits[1]
    return "\n".join(lines[:second]).rstrip()


def _collapse_consecutive_duplicate_lines(text: str) -> str:
    lines = text.splitlines()
    if not lines:
        return text.strip()
    out: list[str] = []
    prev: str | None = None
    for line in lines:
        key = line.strip()
        if key and key == prev:
            continue
        out.append(line)
        prev = key if key else prev
    return "\n".join(out).strip()
