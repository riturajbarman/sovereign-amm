from typing import Literal, List
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.app.api.deps import auth_scope, grid_scope
from backend.app.engine_facade import engine_facade

router = APIRouter(tags=["history"])

class HistoryPoint(BaseModel):
    t: int
    micro_price: float
    soc_pct: float
    sigma: float
    c_deg: float

@router.get("/api/history/{grid_id}", response_model=List[HistoryPoint])
async def get_history(
    grid_id: str,
    window: Literal["1H", "4H", "24H", "ALL"] = "1H",
    user=Depends(auth_scope),
):
    grid_scope(grid_id, user)
    return await engine_facade.history(grid_id, window)

@router.get("/api/export/{grid_id}")
async def export_ticks(
    grid_id: str,
    start: int | None = None,
    end: int | None = None,
    user=Depends(auth_scope),
):
    grid_scope(grid_id, user)
    return StreamingResponse(
        engine_facade.ticks_csv_rows(grid_id, start, end),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{grid_id}_ticks.csv"'},
    )
