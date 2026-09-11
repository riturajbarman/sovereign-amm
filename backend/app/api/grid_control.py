from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.api.deps import grid_scope, auth_scope
from backend.app.api.schemas import InjectRequest
from backend.app.engine_facade import engine_facade

router = APIRouter(prefix="/grid", tags=["grid_control"])

@router.post("/{grid_id}/inject")
async def manual_injection(
    request: InjectRequest,
    grid_id: str = Depends(grid_scope),
    user: dict = Depends(auth_scope)
):
    """
    Apply a manual injection (between -5.0 MW and 5.0 MW) to a specific bus.
    """
    # Assuming the engine_facade has a method to handle this
    # E.g. setting state.manual_injections
    success = await engine_facade.apply_manual_injection(grid_id, request.bus_id, request.injection_mw)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Failed to apply injection. Invalid bus or out of range."
        )
    return {"status": "success", "bus_id": request.bus_id, "injection_mw": request.injection_mw}
