"""Print SET/MISSING for mail-related env keys (no secret values)."""
from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

# Keep in sync with Backend/scripts/sync_env_to_railway.py SYNC_KEYS (mail + email automation).
KEYS = [
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "SMTP_FROM_NAME",
    "SMTP_USE_TLS",
    "SMTP_IMPLICIT_SSL",
    "SMTP_TIMEOUT_SECONDS",
    "EMAIL_ENABLED",
    "RM_DEFAULT_EMAIL",
    "IMAP_ENABLED",
    "IMAP_HOST",
    "IMAP_PORT",
    "IMAP_USE_SSL",
    "IMAP_USER",
    "IMAP_PASSWORD",
    "IMAP_MAILBOX",
    "EMAIL_POLL_SECRET",
]


def _strip_env_value(raw: str) -> str:
    """Unquoted values: drop trailing ` # comment`. Quoted: strip outer quotes only."""
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        return raw[1:-1]
    return re.sub(r"\s+#.*$", "", raw).strip()


def parse_env_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = _strip_env_value(v)
    return out


def merge_local_env(keys: list[str], env_file: dict[str, str]) -> dict[str, str | None]:
    """os.environ overrides .env (same precedence as pydantic-settings)."""
    merged: dict[str, str | None] = {}
    for k in keys:
        if k in os.environ:
            merged[k] = os.environ[k]
        elif k in env_file:
            merged[k] = env_file[k]
        else:
            merged[k] = None
    return merged


def _print_rows(values: dict[str, str | None]) -> None:
    for k in KEYS:
        v = values.get(k)
        if v is None:
            print(f"  {k}: MISSING")
        elif not v.strip():
            print(f"  {k}: EMPTY")
        else:
            print(f"  {k}: SET (len={len(v)})")


def main() -> int:
    backend = Path(__file__).resolve().parents[1]
    env_path = backend / ".env"
    file_vals = parse_env_file(env_path)
    local = merge_local_env(KEYS, file_vals)
    print("=== Local (Backend/.env + process env; OS env wins over file) ===")
    _print_rows(local)

    railway = shutil.which("railway")
    if not railway:
        print("\nRailway CLI not in PATH — skip remote check.")
        return 0
    r = subprocess.run(
        [railway, "variables", "-k"],
        cwd=str(backend.parent),
        capture_output=True,
        text=True,
    )
    print("\n=== Railway (linked service) ===")
    if r.returncode != 0:
        print(r.stderr[:500] or "railway variables failed")
        return r.returncode
    remote: dict[str, str | None] = {k: None for k in KEYS}
    for line in r.stdout.splitlines():
        if "=" in line:
            a, b = line.split("=", 1)
            key = a.strip()
            if key in remote:
                remote[key] = b.strip()
    _print_rows(remote)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
