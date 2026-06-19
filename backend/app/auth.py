import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

JWT_SECRET = os.getenv("JWT_SECRET", "vinlab-demo-secret-change-in-production")
JWT_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", "28800"))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def _base64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 180_000)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_hex, digest_hex = password_hash.split(":", 1)
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode(),
            bytes.fromhex(salt_hex),
            180_000,
        )
        return hmac.compare_digest(actual.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(user: User) -> str:
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "username": user.username,
        "iat": now,
        "exp": now + JWT_EXPIRE_SECONDS,
    }
    encoded_header = _base64url_encode(json.dumps(header, separators=(",", ":")).encode())
    encoded_payload = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{encoded_header}.{encoded_payload}"
    signature = hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_base64url_encode(signature)}"


def decode_access_token(token: str) -> dict:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        signing_input = f"{encoded_header}.{encoded_payload}"
        expected = hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
        actual = _base64url_decode(encoded_signature)
        if not hmac.compare_digest(expected, actual):
            raise ValueError("invalid signature")
        payload = json.loads(_base64url_decode(encoded_payload))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(401, "Không tìm thấy tài khoản")
    return user


def require_role(*roles: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(403, "Bạn không có quyền thực hiện chức năng này")
        return current_user

    return dependency
