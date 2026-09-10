from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any
from backend.app.api.deps import grid_scope
from backend.app.db.storage import storage

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/{grid_id}")
def get_history(
    grid_id: str = Depends(grid_scope),
    window: str = Query("24H", description="Time window (e.g., 1H, 4H, 24H, ALL)")
) -> List[Dict[str, Any]]:
    """
    Retrieve historical ticks using DuckDB columnar rollups (1-minute bins for 24H and ALL).
    """
    return storage.query_history(grid_id, window)

from fastapi.responses import StreamingResponse
from backend.app.engine_facade import engine_facade

@router.get("/export/{grid_id}")
async def export_history(
    grid_id: str = Depends(grid_scope)
):
    """
    Stream raw tick rows as CSV without memory bloat.
    """
    return StreamingResponse(
        engine_facade.ticks_csv_rows(grid_id),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=history_{grid_id}.csv"}
    )
