from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.api.deps import get_current_token_payload, get_current_user, get_db, parse_payload_exp_utc
from app.core.csrf import generate_csrf_token, set_csrf_cookie
from app.core.rate_limit import AUTH_RATE, limiter
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.agent_profile import AgentProfile
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserLoginInfo, UserRead

router = APIRouter()


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
    user = _authenticate(db, payload.email, payload.password)
    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)
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
    user = _authenticate(db, form_data.username, form_data.password)
    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)
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
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password"}},
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "INACTIVE_USER", "message": "User account is deactivated"}},
        )
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
