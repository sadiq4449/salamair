import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.tag import Tag, request_tags
from app.models.user import User
from app.schemas.advanced_schema import TagCreate, TagOut

router = APIRouter()


def _usage_subquery(db: Session):
    return (
        select(request_tags.c.tag_id, func.count().label("cnt"))
        .group_by(request_tags.c.tag_id)
        .subquery()
    )


@router.get("", response_model=list[TagOut])
def list_tags(
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("agent", "sales", "admin")),
):
    usage = _usage_subquery(db)
    rows = (
        db.query(Tag, func.coalesce(usage.c.cnt, 0).label("usage_count"))
        .outerjoin(usage, Tag.id == usage.c.tag_id)
        .order_by(Tag.name.asc())
        .all()
    )
    return [
        TagOut(id=t.id, name=t.name, color=t.color, usage_count=int(uc or 0))
        for t, uc in rows
    ]


@router.post("", response_model=TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(
    payload: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    existing = db.query(Tag).filter(func.lower(Tag.name) == payload.name.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "DUPLICATE", "message": "A tag with this name already exists"}},
        )
    tag = Tag(name=payload.name.strip(), color=payload.color, created_by=current_user.id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return TagOut(id=tag.id, name=tag.name, color=tag.color, usage_count=0)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Tag not found"}},
        )
    db.delete(tag)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
