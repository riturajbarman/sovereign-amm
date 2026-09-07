import json
import time
from typing import Literal, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from pydantic import BaseModel, Field

from backend.app.api.deps import auth_scope, grid_scope, ws_auth_scope
from backend.app.engine_facade import engine_facade
from engine.types import ManualInjectionEvent, GridResetEvent

router = APIRouter(tags=["grid_control"])

class LineFlow(BaseModel):
    from_bus: str
    to_bus: str
    flow_pct: float      # of f_max

class LmpRow(BaseModel):
    rank: int
    bus: str
    lmp: float
    inj_mw: float
    status: Literal["OK", "CONSTRAINED", "BLOCKED"]

class GridState(BaseModel):
    grid_id: str
    ts: int
    lines: List[LineFlow]
    lmp: List[LmpRow]

class InjectRequest(BaseModel):
    bus_id: str
    injection_mw: float = Field(ge=-5.0, le=5.0)

@router.websocket("/ws/grid/{grid_id}")
async def grid_ws(ws: WebSocket, grid_id: str):
    await ws.accept()
    try:
        await ws_auth_scope(ws, grid_id)
    except Exception:
        return

    async for snapshot in engine_facade.stream_grid(grid_id, hz=1):
        try:
            await ws.send_text(json.dumps(snapshot))
        except Exception:
            break

@router.post("/api/control/inject")
async def inject(
    req: InjectRequest,
    grid_id: str = "demo",
    user=Depends(auth_scope),
):
    grid_scope(grid_id, user)
    valid_buses = [f"BUS-0{i}" for i in range(1, 8)]
    if req.bus_id not in valid_buses:
        raise HTTPException(status_code=422, detail="unknown bus")
        
    now_ms = int(time.time() * 1000)
    user_id = user.get("id", "operator")
    event = ManualInjectionEvent(
        sequence_number=0, # Assigned by EngineFacade EventLog
        bus_id=req.bus_id,
        mw=req.injection_mw,
        ts=now_ms,
        actor=user_id
    )
    await engine_facade.apply_event(grid_id, event)
    return {"accepted": True}

@router.post("/api/control/reset")
async def reset(grid_id: str = "demo", user=Depends(auth_scope)):
    grid_scope(grid_id, user)
    now_ms = int(time.time() * 1000)
    user_id = user.get("id", "operator")
    event = GridResetEvent(
        sequence_number=0,
        ts=now_ms,
        actor=user_id
    )
    await engine_facade.apply_event(grid_id, event)
    return {"accepted": True}
