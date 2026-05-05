from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.api.deps import get_current_token_payload, get_current_user, get_db, parse_payload_exp_utc
from app.core.config import settings
from app.core.csrf import generate_csrf_token, set_csrf_cookie
from app.core.rate_limit import AUTH_RATE, limiter
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.agent_profile import AgentProfile
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserLoginInfo, UserRead
from app.services.security_audit import log_security_event

router = APIRouter()


def _request_meta(request: Request) -> dict:
    return {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "path": request.url.path,
    }


@router.get("/csrf")
def issue_csrf_cookie(response: Response):
    """Issue or refresh the CSRF double-submit cookie (call from SPA before mutating requests)."""
    token = generate_csrf_token()
    set_csrf_cookie(response, token)
    return {"csrf_token": token}


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_RATE)
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    _ = request  # used by slowapi
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "EMAIL_EXISTS", "message": "A user with this email already exists"}},
        )

    user = User(
        name=payload.name,
        email=payload.email,
        password=get_password_hash(payload.password),
        role=payload.role.value,
        city=payload.city,
    )
    db.add(user)
    db.flush()
    if payload.role.value == "agent":
        db.add(AgentProfile(user_id=user.id, company_name=None, credit_limit=Decimal("0")))
    db.commit()
    db.refresh(user)
    log_security_event(
        "auth.register.success",
        user_id=str(user.id),
        email=user.email,
        role=user.role,
        **_request_meta(request),
    )
    body = jsonable_encoder(UserRead.model_validate(user))
    csrf = generate_csrf_token()
    body["csrf_token"] = csrf
    resp = JSONResponse(content=body, status_code=status.HTTP_201_CREATED)
    set_csrf_cookie(resp, csrf)
    return resp


@router.post("/login")
@limiter.limit(AUTH_RATE)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    _ = request
    """Login with JSON body."""
    user = _authenticate(db, payload.email, payload.password, request=request)
    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)
    log_security_event(
        "auth.login.success",
        user_id=str(user.id),
        email=user.email,
        role=user.role,
        **_request_meta(request),
    )
    return _token_json_response(user)


@router.post("/login/token", tags=["Authentication"])
@limiter.limit(AUTH_RATE)
def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    _ = request
    """Login with OAuth2 form data (for Swagger UI "Authorize" button).
    Use email as the username field."""
    user = _authenticate(db, form_data.username, form_data.password, request=request)
    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)
    log_security_event(
        "auth.login.success",
        user_id=str(user.id),
        email=user.email,
        role=user.role,
        **_request_meta(request),
    )
    return _token_json_response(user)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    current_user: User = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
):
    token_jti = str(payload.get("jti"))
    expires_at = parse_payload_exp_utc(payload)
    already = db.query(RevokedToken).filter(RevokedToken.jti == token_jti).first()
    if not already:
        db.add(RevokedToken(user_id=current_user.id, jti=token_jti, expires_at=expires_at))
        db.commit()
    log_security_event(
        "auth.logout.success",
        user_id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _authenticate(db: Session, email: str, password: str, request: Request | None = None) -> User:
    req_meta = {}
    if request is not None:
        req_meta = _request_meta(request)
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        log_security_event("auth.login.failed_user_not_found", email=email, **req_meta)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password"}},
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.lockout_until and user.lockout_until > now:
        mins = settings.LOGIN_LOCKOUT_MINUTES
        log_security_event(
            "auth.login.blocked_locked_account",
            user_id=str(user.id),
            email=user.email,
            lockout_minutes=mins,
            **req_meta,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "ACCOUNT_LOCKED",
                    "message": f"Account temporarily locked due to repeated failed logins. Try again in about {mins} minutes.",
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(password, user.password):
        attempts = int(user.failed_login_attempts or 0) + 1
        user.failed_login_attempts = attempts
        if attempts >= settings.LOGIN_MAX_ATTEMPTS:
            user.lockout_until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
        db.add(user)
        db.commit()
        log_security_event(
            "auth.login.failed_bad_password",
            user_id=str(user.id),
            email=user.email,
            failed_attempts=attempts,
            locked=attempts >= settings.LOGIN_MAX_ATTEMPTS,
            **req_meta,
        )
        if attempts >= settings.LOGIN_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": {
                        "code": "ACCOUNT_LOCKED",
                        "message": (
                            "Too many failed login attempts. "
                            f"Account locked for {settings.LOGIN_LOCKOUT_MINUTES} minutes."
                        ),
                    }
                },
                headers={"WWW-Authenticate": "Bearer"},
            )
        remaining = max(settings.LOGIN_MAX_ATTEMPTS - attempts, 0)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": f"Incorrect email or password. {remaining} attempt(s) remaining before temporary lockout.",
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        log_security_event("auth.login.blocked_inactive_user", user_id=str(user.id), email=user.email, **req_meta)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "INACTIVE_USER", "message": "User account is deactivated"}},
        )
    user.failed_login_attempts = 0
    user.lockout_until = None
    return user


def _build_token_response(user: User) -> dict:
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserLoginInfo.model_validate(user),
    }


def _token_json_response(user: User) -> JSONResponse:
    data = _build_token_response(user)
    csrf = generate_csrf_token()
    data["csrf_token"] = csrf
    resp = JSONResponse(content=jsonable_encoder(TokenResponse.model_validate(data)))
    set_csrf_cookie(resp, csrf)
    return resp
