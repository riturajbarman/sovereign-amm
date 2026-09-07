from typing import Literal, List
from fastapi import APIRouter, WebSocket, Depends
from pydantic import BaseModel
import json

from backend.app.api.deps import ws_auth_scope
from backend.app.engine_facade import engine_facade

router = APIRouter(tags=["orderbook"])

class BookLevel(BaseModel):
    price: int      # micro-INR/kWh
    cum_qty: int    # micro-kWh

class TimeAndSale(BaseModel):
    ts: int
    side: Literal["BUY", "SELL"]
    price: int
    qty: int

class OrderBookSnapshot(BaseModel):
    grid_id: str
    ts: int
    spread: int
    micro_price: int
    book_depth: int          # total resting qty, both sides
    obi: float                # top-5 imbalance, range -1..+1
    bids: List[BookLevel]     # best-first
    asks: List[BookLevel]     # best-first
    tape: List[TimeAndSale]   # last 50, newest-first

@router.websocket("/ws/orderbook/{grid_id}")
async def orderbook_ws(ws: WebSocket, grid_id: str):
    await ws.accept()
    # Validate auth scope for WebSocket connection
    try:
        await ws_auth_scope(ws, grid_id)
    except Exception:
        return

    async for snapshot in engine_facade.stream_orderbook(grid_id, hz=10):
        try:
            # Stream JSON or MsgPack per transport contract
            await ws.send_text(json.dumps(snapshot))
        except Exception:
            break
