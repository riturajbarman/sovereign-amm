import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from backend.app.core.config import settings

ALGORITHM = "HS256"

def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def verify_grid_scope(token_payload: Dict[str, Any], grid_id: str) -> bool:
    """
    Check if the token's grid_id claim matches the requested grid_id.
    Admin roles bypass this check.
    """
    token_grid_id = token_payload.get("grid_id")
    role = token_payload.get("role")
    
    if role == "admin":
        return True
        
    return token_grid_id == grid_id
