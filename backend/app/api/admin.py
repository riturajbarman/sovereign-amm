from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

from backend.app.core.auth import require_role, get_password_hash
from backend.app.db.store import store

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Guard all routes in this router with admin role
def admin_user(user: Dict[str, Any] = Depends(require_role(["admin"]))):
    return user

@router.get("/users")
def list_users(admin: Dict[str, Any] = Depends(admin_user)):
    users = store.list_users()
    safe_users = []
    for u in users:
        u_copy = u.copy()
        u_copy.pop("password_hash", None)
        safe_users.append(u_copy)
    return safe_users

class ApproveRequest(BaseModel):
    assigned_bus_id: int

@router.post("/users/{user_id}/approve")
def approve_user(user_id: str, req: ApproveRequest, admin: Dict[str, Any] = Depends(admin_user)):
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    store.update_user(user["email"], {
        "status": "approved",
        "assigned_bus_id": req.assigned_bus_id
    })
    return {"message": "User approved and bus assigned."}

@router.post("/users/{user_id}/reject")
def reject_user(user_id: str, admin: Dict[str, Any] = Depends(admin_user)):
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    store.update_user(user["email"], {"status": "rejected"})
    return {"message": "User rejected."}

class RoleRequest(BaseModel):
    role: str

@router.post("/users/{user_id}/role")
def update_role(user_id: str, req: RoleRequest, admin: Dict[str, Any] = Depends(admin_user)):
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user["id"] == admin["id"]:
        raise HTTPException(status_code=403, detail="Admin cannot change their own role")
        
    valid_roles = ["admin", "grid_operator", "battery_operator", "market_participant", "viewer"]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    store.update_user(user["email"], {"role": req.role})
    return {"message": f"Role updated to {req.role}"}

class ResetPasswordRequest(BaseModel):
    new_password: str

@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: str, req: ResetPasswordRequest, admin: Dict[str, Any] = Depends(admin_user)):
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hashed_pwd = get_password_hash(req.new_password)
    store.update_user(user["email"], {"password_hash": hashed_pwd})
    return {"message": "Password reset successfully"}
