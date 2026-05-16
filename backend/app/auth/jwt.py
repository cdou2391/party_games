import uuid
from datetime import datetime, timedelta, timezone

from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import OctKey
from joserfc.jwt import JWTClaimsRegistry

from app.config import settings

_CLAIMS_REGISTRY = JWTClaimsRegistry(exp={"essential": True})


def _key() -> OctKey:
    return OctKey.import_key(settings.jwt_secret.encode())


def create_token(user_id: uuid.UUID, is_guest: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    header = {"alg": settings.jwt_algorithm}
    payload = {"sub": str(user_id), "is_guest": is_guest, "exp": int(expire.timestamp())}
    return jwt.encode(header, payload, _key())


def decode_token(token: str) -> dict:
    try:
        decoded = jwt.decode(token, _key())
        _CLAIMS_REGISTRY.validate(decoded.claims)
        return decoded.claims
    except JoseError:
        return {}
