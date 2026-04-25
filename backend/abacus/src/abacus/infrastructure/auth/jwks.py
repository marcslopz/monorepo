import uuid

import httpx
import jwt
from cachetools import TTLCache
from jwt import PyJWKSet
from jwt.exceptions import InvalidTokenError
from jwt.types import Options


class JWKSClient:
    def __init__(self, jwks_url: str, audience: str) -> None:
        self._jwks_url = jwks_url
        self._audience = audience
        self._key_cache: TTLCache[str, PyJWKSet] = TTLCache(maxsize=1, ttl=3600)

    async def _get_jwks(self) -> PyJWKSet:
        if "keys" in self._key_cache:
            return self._key_cache["keys"]
        async with httpx.AsyncClient() as client:
            resp = await client.get(self._jwks_url, timeout=10.0)
            resp.raise_for_status()
            jwks = PyJWKSet.from_dict(resp.json())
            self._key_cache["keys"] = jwks
            return jwks

    async def validate_token(self, token: str) -> dict[str, str]:
        jwks = await self._get_jwks()
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")

        signing_key = None
        for k in jwks.keys:
            if k.key_id == kid:
                signing_key = k
                break
        if signing_key is None:
            raise InvalidTokenError(f"No key found for kid={kid}")

        audience = self._audience if self._audience else None
        options: Options | None = None if self._audience else Options(verify_aud=False)

        payload: dict[str, str] = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "EdDSA"],
            audience=audience,
            options=options,
        )

        if "sub" not in payload:
            raise InvalidTokenError("Missing 'sub' claim")
        uuid.UUID(payload["sub"])
        return payload
