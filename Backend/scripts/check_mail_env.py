"""Print SET/MISSING for mail-related env keys (no secret values)."""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

KEYS = [
    "IMAP_USER",
    "IMAP_PASSWORD",
    "IMAP_HOST",
    "IMAP_PORT",
    "IMAP_USE_SSL",
    "IMAP_ENABLED",
    "IMAP_MAILBOX",
    "RESEND_API_KEY",
    "SMTP_FROM_EMAIL",
]


def parse_env_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def main() -> int:
    backend = Path(__file__).resolve().parents[1]
    env_path = backend / ".env"
    print("=== Local Backend/.env ===")
    local = parse_env_file(env_path)
    for k in KEYS:
        v = local.get(k)
        if v is None:
            print(f"  {k}: MISSING")
        elif not v:
            print(f"  {k}: EMPTY")
        else:
            print(f"  {k}: SET (len={len(v)})")

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
    remote: dict[str, str] = {}
    for line in r.stdout.splitlines():
        if "=" in line:
            a, b = line.split("=", 1)
            remote[a.strip()] = b.strip()
    for k in KEYS:
        v = remote.get(k)
        if v is None:
            print(f"  {k}: MISSING")
        elif not v:
            print(f"  {k}: EMPTY")
        else:
            print(f"  {k}: SET (len={len(v)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
