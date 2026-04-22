import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.core.config import settings
from app.models.user import User
from app.models.user_gmail_credential import UserGmailCredential
from app.services.gmail_api_service import GMAIL_SCOPES, build_flow, google_oauth_configured

router = APIRouter()

STATE_EXP_MIN = 10


@router.get("/gmail/status", response_model=dict)
def gmail_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(UserGmailCredential)
        .filter(UserGmailCredential.user_id == current_user.id)
        .first()
    )
    return {"gmail_connected": row is not None, "gmail_configured": google_oauth_configured()}


@router.get("/gmail/authorize", response_model=dict)
def gmail_authorize(
    current_user: User = Depends(require_role("agent", "sales", "admin")),
):
    if not google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": {
                    "code": "GMAIL_NOT_CONFIGURED",
                    "message": "Gmail integration is not configured. Set GOOGLE_OAUTH_CLIENT_ID, "
                    "GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI on the server.",
                }
            },
        )
    now = datetime.now(timezone.utc)
    st = jwt.encode(
        {
            "sub": str(current_user.id),
            "typ": "gmail_oauth",
            "exp": now + timedelta(minutes=STATE_EXP_MIN),
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    flow = build_flow()
    url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=st,
        prompt="consent",
    )
    return {"authorization_url": url}


@router.get("/gmail/callback")
def gmail_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
    error: str | None = None,
):
    if error:
        base = (settings.GOOGLE_OAUTH_SUCCESS_REDIRECT or "/").rstrip("/")
        return RedirectResponse(
            url=f"{base}?gmail_error=1",
            status_code=status.HTTP_302_FOUND,
        )
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_STATE", "message": "Invalid or expired OAuth state."}},
        )
    if payload.get("typ") != "gmail_oauth" or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_STATE", "message": "Invalid OAuth state payload."}},
        )
    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_STATE", "message": "Invalid user in state."}},
        )

    flow = build_flow()
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "OAUTH_EXCHANGE_FAILED",
                    "message": f"Could not exchange code for token: {e!s}",
                }
            },
        ) from e

    creds = flow.credentials
    if not creds.refresh_token:
        row = (
            db.query(UserGmailCredential)
            .filter(UserGmailCredential.user_id == user_id)
            .first()
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "NO_REFRESH_TOKEN",
                        "message": "Google did not return a refresh token. Try revoking the app in "
                        "Google Account → Security and connect again, or your OAuth client may need "
                        "prompt=consent and access_type=offline (already set here).",
                    }
                },
            )
    new_rt = creds.refresh_token
    scope_s = " ".join(creds.scopes) if creds.scopes else " ".join(GMAIL_SCOPES)
    if new_rt:
        row = (
            db.query(UserGmailCredential)
            .filter(UserGmailCredential.user_id == user_id)
            .first()
        )
        if row:
            row.refresh_token = new_rt
            row.scopes = scope_s
        else:
            db.add(
                UserGmailCredential(
                    user_id=user_id,
                    refresh_token=new_rt,
                    scopes=scope_s,
                )
            )
    db.commit()
    base = (settings.GOOGLE_OAUTH_SUCCESS_REDIRECT or "http://localhost:5173/").strip().rstrip("/")
    joiner = "&" if "?" in base else "?"
    return RedirectResponse(
        url=f"{base}{joiner}gmail_connected=1",
        status_code=status.HTTP_302_FOUND,
    )


@router.delete("/gmail", response_model=dict)
def gmail_disconnect(
    current_user: User = Depends(require_role("agent", "sales", "admin")),
    db: Session = Depends(get_db),
):
    n = (
        db.query(UserGmailCredential)
        .filter(UserGmailCredential.user_id == current_user.id)
        .delete()
    )
    db.commit()
    return {"ok": True, "disconnected": n > 0}
