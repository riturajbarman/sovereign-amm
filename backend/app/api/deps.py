import jwt
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Header, WebSocket, status, Request
from backend.app.core.security import decode_token, verify_grid_scope
from backend.app.core.config import settings

def get_token_from_header_or_cookie(
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    return None

def auth_scope(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = get_token_from_header_or_cookie(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Missing authorization header"
        )
    return decode_token(token)

def grid_scope(request: Request, user: Dict[str, Any] = Depends(auth_scope)) -> str:
    # Extract grid_id from the path params
    grid_id = request.path_params.get("grid_id")
    if not grid_id:
        return "" # some endpoints might not have grid_id
    
    if not verify_grid_scope(user, grid_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access to grid_id forbidden"
        )
    return grid_id

async def ws_auth_scope(ws: WebSocket, grid_id: str) -> Dict[str, Any]:
    token = ws.query_params.get("token") or ws.headers.get("sec-websocket-protocol")
    if not token:
        await ws.close(code=4403, reason="Missing authentication token")
        raise HTTPException(status_code=403, detail="Missing auth token")
    
    try:
        payload = decode_token(token)
        if not verify_grid_scope(payload, grid_id):
            await ws.close(code=4403, reason="Grid scope mismatch")
            raise HTTPException(status_code=403, detail="Grid scope mismatch")
        return payload
    except Exception:
        await ws.close(code=4403, reason="Invalid authentication token")
        raise HTTPException(status_code=403, detail="Invalid token")
