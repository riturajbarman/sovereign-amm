import aiosqlite
import duckdb
import json
import uuid
import time
from typing import List, Dict, Any, AsyncGenerator
from backend.app.core.config import settings

class StorageManager:
    def __init__(self, db_path: str = settings.DATABASE_PATH):
        self.db_path = db_path
        # Sync init of duckdb for analytics
        self.duck = duckdb.connect()
        try:
            self.duck.execute("INSTALL sqlite;")
            self.duck.execute("LOAD sqlite;")
        except Exception:
            pass

    async def init_db(self):
        # Create directory if not exists
        import os
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA journal_mode=WAL;")
            await db.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    grid_id TEXT,
                    event_type TEXT,
                    payload TEXT,
                    timestamp INTEGER
                );
            """)
            await db.execute("CREATE INDEX IF NOT EXISTS idx_events_grid_ts ON events(grid_id, timestamp);")

            await db.execute("""
                CREATE TABLE IF NOT EXISTS ticks (
                    ts INTEGER PRIMARY KEY,
                    grid_id TEXT,
                    micro_price INTEGER,
                    soc_pct REAL,
                    sigma REAL,
                    c_deg REAL
                );
            """)
            await db.execute("CREATE INDEX IF NOT EXISTS idx_ticks_grid_ts ON ticks(grid_id, ts);")
            await db.commit()
            
        # Attach duckdb
        self.duck.execute(f"ATTACH '{self.db_path}' AS sovereign_db (TYPE SQLITE);")

    async def insert_event(self, grid_id: str, event_type: str, payload: dict, ts: int):
        event_id = str(uuid.uuid4())
        payload_str = json.dumps(payload)
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO events (id, grid_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?, ?)",
                (event_id, grid_id, event_type, payload_str, ts)
            )
            await db.commit()

    async def insert_tick(self, ts: int, grid_id: str, micro_price: int, soc_pct: float, sigma: float, c_deg: float):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                (ts, grid_id, micro_price, soc_pct, sigma, c_deg)
            )
            await db.commit()

    def query_history(self, grid_id: str, window: str) -> List[Dict[str, Any]]:
        now_ms = int(time.time() * 1000)
        
        if window == "1H":
            cutoff = now_ms - (3600 * 1000)
            use_rollup = False
        elif window == "4H":
            cutoff = now_ms - (4 * 3600 * 1000)
            use_rollup = False
        elif window == "24H":
            cutoff = now_ms - (24 * 3600 * 1000)
            use_rollup = True
        elif window == "ALL":
            cutoff = 0
            use_rollup = True
        else:
            cutoff = 0
            use_rollup = True

        if use_rollup:
            # 1-minute columnar rollups via DuckDB
            query = f"""
                SELECT 
                    CAST((ts / 60000) * 60000 AS BIGINT) AS t,
                    avg(micro_price) AS micro_price,
                    avg(soc_pct) AS soc_pct,
                    avg(sigma) AS sigma,
                    avg(c_deg) AS c_deg
                FROM sovereign_db.ticks 
                WHERE grid_id = '{grid_id}' AND ts >= {cutoff}
                GROUP BY t
                ORDER BY t ASC
            """
        else:
            # Raw ticks via DuckDB
            query = f"""
                SELECT ts AS t, micro_price, soc_pct, sigma, c_deg 
                FROM sovereign_db.ticks 
                WHERE grid_id = '{grid_id}' AND ts >= {cutoff}
                ORDER BY t ASC
            """
            
        result = self.duck.execute(query)
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        records = [dict(zip(columns, row)) for row in rows]
        return records

    async def stream_ticks_csv(self, grid_id: str, start: int = None, end: int = None) -> AsyncGenerator[str, None]:
        yield "ts,grid_id,micro_price,soc_pct,sigma,c_deg\n"
        query = "SELECT ts, grid_id, micro_price, soc_pct, sigma, c_deg FROM ticks WHERE grid_id = ?"
        params = [grid_id]
        if start is not None:
            query += " AND ts >= ?"
            params.append(start)
        if end is not None:
            query += " AND ts <= ?"
            params.append(end)
        query += " ORDER BY ts ASC"
        
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                async for row in cursor:
                    yield f"{row[0]},{row[1]},{row[2]},{row[3]},{row[4]},{row[5]}\n"

storage = StorageManager()
