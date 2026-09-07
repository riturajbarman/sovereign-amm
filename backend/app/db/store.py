import json
import os
import pathlib
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from backend.app.db.database import SyncSessionLocal, sync_engine, Base
from backend.app.db.models import UserModel

DB_FILE = pathlib.Path(__file__).parent / "store.json"

class PostgresUserStore:
    """
    PostgreSQL-backed store with JSON fallback for seamless development & production runtime.
    """
    def __init__(self):
        try:
            Base.metadata.create_all(bind=sync_engine)
            self._use_postgres = True
        except Exception as e:
            print(f"[STORE WARNING] Could not initialize Postgres schema ({e}). Using local memory/JSON fallback.")
            self._use_postgres = False
            self.file_path = DB_FILE
            self._data = {"users": {}}
            self._load_json()

    def _load_json(self):
        if DB_FILE.exists():
            with open(DB_FILE, "r") as f:
                self._data = json.load(f)
        else:
            self._save_json()

    def _save_json(self):
        with open(DB_FILE, "w") as f:
            json.dump(self._data, f, indent=4)

    def _model_to_dict(self, model: UserModel) -> Dict[str, Any]:
        return {
            "id": model.id,
            "email": model.email,
            "password_hash": model.password_hash,
            "role": model.role,
            "status": model.status,
            "consumer_no": model.consumer_no,
            "connection_type": model.connection_type,
            "sanctioned_load_kw": model.sanctioned_load_kw,
            "solar_kwp": model.solar_kwp,
            "inverter_rating_kw": model.inverter_rating_kw,
            "assigned_bus_id": model.assigned_bus_id,
            "bank_account_masked": model.bank_account_masked
        }

    def get_user(self, email: str) -> Optional[Dict[str, Any]]:
        if not self._use_postgres:
            return self._data["users"].get(email)
        
        session: Session = SyncSessionLocal()
        try:
            user_model = session.query(UserModel).filter(UserModel.email == email).first()
            return self._model_to_dict(user_model) if user_model else None
        finally:
            session.close()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not self._use_postgres:
            for user in self._data["users"].values():
                if user["id"] == user_id:
                    return user
            return None

        session: Session = SyncSessionLocal()
        try:
            user_model = session.query(UserModel).filter(UserModel.id == user_id).first()
            return self._model_to_dict(user_model) if user_model else None
        finally:
            session.close()

    def add_user(self, user: Dict[str, Any]):
        if not self._use_postgres:
            self._data["users"][user["email"]] = user
            self._save_json()
            return

        session: Session = SyncSessionLocal()
        try:
            user_model = UserModel(
                id=user["id"],
                email=user["email"],
                password_hash=user["password_hash"],
                role=user.get("role", "market_participant"),
                status=user.get("status", "pending"),
                consumer_no=user.get("consumer_no"),
                connection_type=user.get("connection_type"),
                sanctioned_load_kw=user.get("sanctioned_load_kw", 0.0),
                solar_kwp=user.get("solar_kwp", 0.0),
                inverter_rating_kw=user.get("inverter_rating_kw", 0.0),
                assigned_bus_id=user.get("assigned_bus_id"),
                bank_account_masked=user.get("bank_account_masked")
            )
            session.merge(user_model)
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_user(self, email: str, updates: Dict[str, Any]):
        if not self._use_postgres:
            if email in self._data["users"]:
                self._data["users"][email].update(updates)
                self._save_json()
            return

        session: Session = SyncSessionLocal()
        try:
            user_model = session.query(UserModel).filter(UserModel.email == email).first()
            if user_model:
                for k, v in updates.items():
                    if hasattr(user_model, k):
                        setattr(user_model, k, v)
                session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def list_users(self) -> List[Dict[str, Any]]:
        if not self._use_postgres:
            return list(self._data["users"].values())

        session: Session = SyncSessionLocal()
        try:
            users = session.query(UserModel).all()
            return [self._model_to_dict(u) for u in users]
        finally:
            session.close()


store = PostgresUserStore()

# Initialize admin seed
if not store.get_user("admin@sovereign.amm"):
    from passlib.hash import argon2
    store.add_user({
        "id": "admin-000",
        "email": "admin@sovereign.amm",
        "password_hash": argon2.hash("admin123"),
        "role": "admin",
        "status": "approved",
        "consumer_no": "",
        "connection_type": "",
        "sanctioned_load_kw": 0,
        "solar_kwp": 0,
        "inverter_rating_kw": 0,
        "assigned_bus_id": None,
        "bank_account_masked": "XXXXXX0000"
    })
