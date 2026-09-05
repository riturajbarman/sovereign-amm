import jwt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException, Security, Request, Cookie
from passlib.hash import argon2
from backend.app.db.store import store

SECRET_KEY = "sovereign-amm-super-secret-key-for-hackathon"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

def get_password_hash(password: str) -> str:
    return argon2.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return argon2.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: Optional[str] = Cookie(None)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = store.get_user(email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    if user["status"] != "approved":
        raise HTTPException(status_code=403, detail=f"User is {user['status']}")
        
    return user

def require_role(roles: List[str]):
    def role_checker(user: dict = Security(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return user
    return role_checker
