"""Lightweight in-process metrics registry for operational visibility."""

from __future__ import annotations

from dataclasses import dataclass
from threading import Lock


@dataclass
class MetricsSnapshot:
    total_requests: int
    total_errors: int
    total_duration_ms: float

    @property
    def avg_duration_ms(self) -> float:
        return self.total_duration_ms / self.total_requests if self.total_requests else 0.0


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._total_requests = 0
        self._total_errors = 0
        self._total_duration_ms = 0.0

    def record(self, *, duration_ms: float, status_code: int) -> None:
        with self._lock:
            self._total_requests += 1
            self._total_duration_ms += duration_ms
            if status_code >= 500:
                self._total_errors += 1

    def snapshot(self) -> MetricsSnapshot:
        with self._lock:
            return MetricsSnapshot(
                total_requests=self._total_requests,
                total_errors=self._total_errors,
                total_duration_ms=self._total_duration_ms,
            )


metrics_registry = MetricsRegistry()
