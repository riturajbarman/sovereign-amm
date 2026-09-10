import msgpack
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Request
from backend.app.api.deps import grid_scope, ws_auth_scope
from backend.app.engine_facade import engine_facade

router = APIRouter(prefix="/orderbook", tags=["orderbook"])

@router.websocket("/ws/{grid_id}")
async def ws_orderbook(websocket: WebSocket, grid_id: str):
    await websocket.accept()
    # Perform WS auth
    try:
        user = await ws_auth_scope(websocket, grid_id)
    except Exception:
        return
        
    try:
        async for snapshot in engine_facade.stream_orderbook(grid_id, hz=10):
            protocol = websocket.headers.get("sec-websocket-protocol", "")
            if "msgpack" in protocol:
                await websocket.send_bytes(msgpack.packb(snapshot))
            else:
                await websocket.send_json(snapshot)
    except WebSocketDisconnect:
        pass
