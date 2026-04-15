from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.search_service import global_search

router = APIRouter()


@router.get("")
def search(
    q: str = Query("", min_length=0),
    type: str = Query("all", alias="type", pattern=r"^(all|requests|agents|messages)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return global_search(db, q, current_user, type_filter=type, page=page, limit=limit)
