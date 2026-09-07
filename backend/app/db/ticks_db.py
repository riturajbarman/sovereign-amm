import sqlite3
import pathlib
import time
from typing import List, Dict, Any, Generator
from sqlalchemy.orm import Session
from backend.app.db.database import SyncSessionLocal, sync_engine, Base
from backend.app.db.models import TickModel, Tick1mModel

DB_PATH = pathlib.Path(__file__).parent.parent.parent / "ticks.db"

class TicksRepository:
    def __init__(self):
        try:
            Base.metadata.create_all(bind=sync_engine)
            self._use_postgres = True
        except Exception:
            self._use_postgres = False
            self._init_sqlite()

    def _init_sqlite(self):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ticks (
                ts INTEGER,
                grid_id TEXT,
                micro_price REAL,
                soc_pct REAL,
                sigma REAL,
                c_deg REAL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ticks_grid_ts ON ticks(grid_id, ts);")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ticks_1m (
                ts INTEGER,
                grid_id TEXT,
                micro_price REAL,
                soc_pct REAL,
                sigma REAL,
                c_deg REAL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ticks_1m_grid_ts ON ticks_1m(grid_id, ts);")
        conn.commit()
        conn.close()

    def insert_tick(self, grid_id: str, ts: int, micro_price: float, soc_pct: float, sigma: float, c_deg: float):
        if not self._use_postgres:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "INSERT INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                (ts, grid_id, micro_price, soc_pct, sigma, c_deg)
            )
            if (ts // 1000) % 60 == 0:
                conn.execute(
                    "INSERT INTO ticks_1m (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                    (ts, grid_id, micro_price, soc_pct, sigma, c_deg)
                )
            conn.commit()
            conn.close()
            return

        session: Session = SyncSessionLocal()
        try:
            tick = TickModel(
                ts=ts, grid_id=grid_id, micro_price=micro_price, soc_pct=soc_pct, sigma=sigma, c_deg=c_deg
            )
            session.add(tick)
            if (ts // 1000) % 60 == 0:
                tick_1m = Tick1mModel(
                    ts=ts, grid_id=grid_id, micro_price=micro_price, soc_pct=soc_pct, sigma=sigma, c_deg=c_deg
                )
                session.add(tick_1m)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    def query_history(self, grid_id: str, window: str) -> List[Dict[str, Any]]:
        now_ms = int(time.time() * 1000)
        if window == "1H":
            cutoff = now_ms - (3600 * 1000)
            use_1m = False
        elif window == "4H":
            cutoff = now_ms - (4 * 3600 * 1000)
            use_1m = False
        elif window == "24H":
            cutoff = now_ms - (24 * 3600 * 1000)
            use_1m = True
        else:
            cutoff = 0
            use_1m = True

        if not self._use_postgres:
            table = "ticks_1m" if use_1m else "ticks"
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT ts as t, micro_price, soc_pct, sigma, c_deg FROM {table} WHERE grid_id = ? AND ts >= ? ORDER BY ts ASC",
                (grid_id, cutoff)
            )
            rows = cursor.fetchall()
            conn.close()
            return [dict(row) for row in rows]

        session: Session = SyncSessionLocal()
        try:
            model = Tick1mModel if use_1m else TickModel
            query = session.query(model).filter(model.grid_id == grid_id, model.ts >= cutoff).order_by(model.ts.asc())
            results = query.all()
            return [
                {
                    "t": r.ts,
                    "micro_price": r.micro_price,
                    "soc_pct": r.soc_pct,
                    "sigma": r.sigma,
                    "c_deg": r.c_deg
                }
                for r in results
            ]
        finally:
            session.close()

    def stream_ticks_csv(self, grid_id: str, start: int | None = None, end: int | None = None) -> Generator[str, None, None]:
        yield "ts,grid_id,micro_price,soc_pct,sigma,c_deg\n"
        if not self._use_postgres:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            query = "SELECT ts, grid_id, micro_price, soc_pct, sigma, c_deg FROM ticks WHERE grid_id = ?"
            params = [grid_id]
            if start is not None:
                query += " AND ts >= ?"
                params.append(start)
            if end is not None:
                query += " AND ts <= ?"
                params.append(end)
            query += " ORDER BY ts ASC"
            cursor.execute(query, params)
            while True:
                rows = cursor.fetchmany(1000)
                if not rows:
                    break
                for row in rows:
                    yield f"{row[0]},{row[1]},{row[2]},{row[3]},{row[4]},{row[5]}\n"
            conn.close()
            return

        session: Session = SyncSessionLocal()
        try:
            query = session.query(TickModel).filter(TickModel.grid_id == grid_id)
            if start is not None:
                query = query.filter(TickModel.ts >= start)
            if end is not None:
                query = query.filter(TickModel.ts <= end)
            query = query.order_by(TickModel.ts.asc())
            
            for row in query.yield_per(1000):
                yield f"{row.ts},{row.grid_id},{row.micro_price},{row.soc_pct},{row.sigma},{row.c_deg}\n"
        finally:
            session.close()

repo = TicksRepository()

def insert_tick(grid_id: str, ts: int, micro_price: float, soc_pct: float, sigma: float, c_deg: float):
    repo.insert_tick(grid_id, ts, micro_price, soc_pct, sigma, c_deg)

def query_history(grid_id: str, window: str) -> List[Dict[str, Any]]:
    return repo.query_history(grid_id, window)

def stream_ticks_csv(grid_id: str, start: int | None = None, end: int | None = None) -> Generator[str, None, None]:
    return repo.stream_ticks_csv(grid_id, start, end)
