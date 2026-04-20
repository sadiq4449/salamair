from sqlalchemy.orm import Session

from app.models.system_config import SystemConfig

_DEFAULT_MB = 10


def get_max_upload_bytes(db: Session) -> int:
    """Respects admin `max_file_size_mb` in system_config when present."""
    row = db.query(SystemConfig).filter(SystemConfig.key == "max_file_size_mb").first()
    raw = (row.value.strip() if row and row.value else "") or str(_DEFAULT_MB)
    try:
        mb = float(raw)
        if mb <= 0:
            mb = float(_DEFAULT_MB)
    except (TypeError, ValueError):
        mb = float(_DEFAULT_MB)
    return int(mb * 1024 * 1024)
