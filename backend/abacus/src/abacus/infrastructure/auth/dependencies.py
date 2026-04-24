import uuid

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from abacus.config import settings
from abacus.infrastructure.auth.jwks import JWKSClient

_security = HTTPBearer(auto_error=False)

# Fixed dev UUID used when auth is disabled (local dev / tests)
_DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Security(_security),  # noqa: B008
) -> uuid.UUID:
    if not settings.auth_enabled:
        # Dev mode: accept any Bearer token and extract sub if present, or use fixed UUID
        if credentials is None:
            return _DEV_USER_ID
        try:
            payload = jwt.decode(
                credentials.credentials,
                key="",
                options={"verify_signature": False, "verify_aud": False},
            )
            return uuid.UUID(str(payload["sub"]))
        except Exception:
            return _DEV_USER_ID

    # Production: full JWKS validation
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jwks_client = JWKSClient(settings.jwks_url, settings.jwt_audience)
    try:
        payload = await jwks_client.validate_token(credentials.credentials)
        return uuid.UUID(payload["sub"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
