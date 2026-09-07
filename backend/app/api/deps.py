import jwt
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Header, WebSocket, status
from backend.app.core.auth import SECRET_KEY, ALGORITHM, check_blacklist, store

def get_token_from_header_or_cookie(
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    return None

def decode_token(token: str) -> Dict[str, Any]:
    if check_blacklist(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def auth_scope(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = get_token_from_header_or_cookie(authorization)
    if not token:
        # For public demo access, return a default guest dictionary if needed, but raise HTTP 401 per spec
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    payload = decode_token(token)
    email = payload.get("sub")
    user = store.get_user(email) if email else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def grid_scope(grid_id: str, user: Dict[str, Any] = Depends(auth_scope)) -> str:
    # Public demo grid scope carve-out
    if grid_id == "demo":
        return grid_id
    token_grid_id = user.get("grid_id", "demo")
    if token_grid_id != grid_id and user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to grid_id forbidden")
    return grid_id

async def ws_auth_scope(ws: WebSocket, grid_id: str) -> Dict[str, Any]:
    # Allow anonymous read-only access for "demo" grid
    if grid_id == "demo":
        return {"sub": "anonymous@demo", "grid_id": "demo", "role": "viewer"}
    
    token = ws.query_params.get("token") or ws.headers.get("sec-websocket-protocol")
    if not token:
        await ws.close(code=4403, reason="Missing authentication token")
        raise HTTPException(status_code=403, detail="Missing auth token")
    
    try:
        payload = decode_token(token)
        token_grid_id = payload.get("grid_id", "demo")
        if token_grid_id != grid_id and payload.get("role") != "admin":
            await ws.close(code=4403, reason="Grid scope mismatch")
            raise HTTPException(status_code=403, detail="Grid scope mismatch")
        return payload
    except Exception:
        await ws.close(code=4403, reason="Invalid authentication token")
        raise HTTPException(status_code=403, detail="Invalid token")
