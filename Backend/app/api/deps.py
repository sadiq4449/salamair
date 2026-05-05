from datetime import datetime, timezone
from typing import Callable, Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.revoked_token import RevokedToken
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login/token")
oauth2_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login/token", auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": {"code": "INVALID_TOKEN", "message": "Could not validate credentials"}},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        token_jti: str | None = payload.get("jti")
        if user_id is None or not token_jti:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    revoked = db.query(RevokedToken).filter(RevokedToken.jti == token_jti).first()
    if revoked:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "INACTIVE_USER", "message": "User account is deactivated"}},
        )
    return user


def get_current_user_optional(
    token: str | None = Depends(oauth2_optional),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        token_jti: str | None = payload.get("jti")
        if user_id is None or not token_jti:
            return None
    except JWTError:
        return None

    revoked = db.query(RevokedToken).filter(RevokedToken.jti == token_jti).first()
    if revoked:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        return None
    return user


def require_role(*roles: str) -> Callable:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": f"Role '{current_user.role}' does not have access. Required: {', '.join(roles)}",
                    }
                },
            )
        return current_user

    return role_checker


def get_current_token_payload(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": {"code": "INVALID_TOKEN", "message": "Could not validate credentials"}},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    token_jti: str | None = payload.get("jti")
    token_exp = payload.get("exp")
    if user_id is None or not token_jti or token_exp is None:
        raise credentials_exception
    if db.query(RevokedToken).filter(RevokedToken.jti == token_jti).first():
        raise credentials_exception
    return payload


def parse_payload_exp_utc(payload: dict) -> datetime:
    exp = payload.get("exp")
    try:
        return datetime.fromtimestamp(float(exp), tz=timezone.utc)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Token expiration is invalid"}},
            headers={"WWW-Authenticate": "Bearer"},
        )
