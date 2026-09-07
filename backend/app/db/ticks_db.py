import sqlite3
import pathlib
import time
from typing import List, Dict, Any, Generator

DB_PATH = pathlib.Path(__file__).parent.parent.parent / "ticks.db"

def init_db():
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
    
    # 1-minute rollups table for 24H and ALL performance
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

init_db()

def insert_tick(grid_id: str, ts: int, micro_price: float, soc_pct: float, sigma: float, c_deg: float):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
        (ts, grid_id, micro_price, soc_pct, sigma, c_deg)
    )
    # Also write to 1m rollup table on every 600th tick (~1 minute at 10Hz)
    if (ts // 1000) % 60 == 0:
        conn.execute(
            "INSERT INTO ticks_1m (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
            (ts, grid_id, micro_price, soc_pct, sigma, c_deg)
        )
    conn.commit()
    conn.close()

def query_history(grid_id: str, window: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    now_ms = int(time.time() * 1000)
    
    if window == "1H":
        cutoff = now_ms - (3600 * 1000)
        table = "ticks"
    elif window == "4H":
        cutoff = now_ms - (4 * 3600 * 1000)
        table = "ticks"
    elif window == "24H":
        cutoff = now_ms - (24 * 3600 * 1000)
        table = "ticks_1m"
    else: # ALL
        cutoff = 0
        table = "ticks_1m"
        
    cursor.execute(
        f"SELECT ts as t, micro_price, soc_pct, sigma, c_deg FROM {table} WHERE grid_id = ? AND ts >= ? ORDER BY ts ASC",
        (grid_id, cutoff)
    )
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def stream_ticks_csv(grid_id: str, start: int | None = None, end: int | None = None) -> Generator[str, None, None]:
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
    
    yield "ts,grid_id,micro_price,soc_pct,sigma,c_deg\n"
    while True:
        rows = cursor.fetchmany(1000)
        if not rows:
            break
        for row in rows:
            yield f"{row[0]},{row[1]},{row[2]},{row[3]},{row[4]},{row[5]}\n"
            
    conn.close()
