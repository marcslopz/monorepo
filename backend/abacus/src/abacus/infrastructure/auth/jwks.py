import uuid

import httpx
from cachetools import TTLCache
from jose import JWTError, jwt


class JWKSClient:
    def __init__(self, jwks_url: str, audience: str) -> None:
        self._jwks_url = jwks_url
        self._audience = audience
        self._key_cache: TTLCache[str, list[dict[str, object]]] = TTLCache(maxsize=1, ttl=3600)

    async def _get_signing_keys(self) -> list[dict[str, object]]:
        if "keys" in self._key_cache:
            return self._key_cache["keys"]
        async with httpx.AsyncClient() as client:
            resp = await client.get(self._jwks_url, timeout=10.0)
            resp.raise_for_status()
            keys: list[dict[str, object]] = resp.json()["keys"]
            self._key_cache["keys"] = keys
            return keys

    async def validate_token(self, token: str) -> dict[str, str]:
        keys = await self._get_signing_keys()
        # Try each key until one validates
        last_error: Exception = JWTError("No keys available")
        for key in keys:
            try:
                decode_kwargs: dict[str, object] = {"algorithms": ["RS256"]}
                if self._audience:
                    decode_kwargs["audience"] = self._audience
                else:
                    decode_kwargs["options"] = {"verify_aud": False}
                payload: dict[str, str] = jwt.decode(token, key, **decode_kwargs)
                if "sub" not in payload:
                    raise JWTError("Missing 'sub' claim")
                # Validate sub is a valid UUID
                uuid.UUID(payload["sub"])
                return payload
            except (JWTError, ValueError) as exc:
                last_error = exc
        raise last_error
