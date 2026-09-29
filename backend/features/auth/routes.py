"""
Auth endpoints: signup, login, logout.
Uses token-based auth — client stores token and sends it as Bearer token.
"""
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
from features.auth.models import User
from features.auth.schemas import SignupRequest, LoginRequest, AuthResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory token store (token -> user_id)
active_tokens = {}


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2 (no external deps needed)."""
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${hashed.hex()}"


def verify_password(plain: str, stored: str) -> bool:
    """Verify a password against its stored hash."""
    try:
        salt, hashed = stored.split("$")
        check = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 100000)
        return check.hex() == hashed
    except (ValueError, AttributeError):
        return False


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    """
    Dependency that extracts and validates the Bearer token.
    Returns the logged-in user or raises 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    user_id = active_tokens.get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """Create a new account. Returns a session token."""
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = secrets.token_urlsafe(32)
    active_tokens[token] = user.id

    return {"token": token, "user_id": user.id, "username": user.username}


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Log in with username + password. Returns a session token."""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = secrets.token_urlsafe(32)
    active_tokens[token] = user.id

    return {"token": token, "user_id": user.id, "username": user.username}


@router.post("/logout", status_code=204)
def logout(authorization: str = Header(None)):
    """Log out by invalidating the token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        active_tokens.pop(token, None)


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently logged-in user's info."""
    return {"user_id": current_user.id, "username": current_user.username, "email": current_user.email}
