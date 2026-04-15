import hashlib
import json
import threading
import time
from typing import Any

from app.core.config import settings

_mem_store: dict[str, tuple[float, Any]] = {}
_mem_lock = threading.Lock()


def _cache_key(prefix: str, payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    h = hashlib.sha256(raw.encode()).hexdigest()[:32]
    return f"{prefix}:{h}"


def get_json(key_payload: dict[str, Any], prefix: str = "analytics") -> Any | None:
    key = _cache_key(prefix, key_payload)
    ttl = settings.ANALYTICS_CACHE_TTL_SECONDS

    if settings.REDIS_URL:
        try:
            import redis  # type: ignore

            r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            raw = r.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception:
            pass

    with _mem_lock:
        entry = _mem_store.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if time.time() > expires_at:
            del _mem_store[key]
            return None
        return value


def set_json(key_payload: dict[str, Any], value: Any, prefix: str = "analytics") -> None:
    key = _cache_key(prefix, key_payload)
    ttl = settings.ANALYTICS_CACHE_TTL_SECONDS
    serialized = json.dumps(value, default=str)

    if settings.REDIS_URL:
        try:
            import redis  # type: ignore

            r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            r.setex(key, ttl, serialized)
            return
        except Exception:
            pass

    with _mem_lock:
        _mem_store[key] = (time.time() + ttl, json.loads(serialized))


def cached_or_compute(key_payload: dict[str, Any], compute: Any, prefix: str = "analytics") -> Any:
    cached = get_json(key_payload, prefix=prefix)
    if cached is not None:
        return cached
    value = compute()
    set_json(key_payload, value, prefix=prefix)
    return value
