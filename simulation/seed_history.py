import asyncio
import time
import numpy as np
import aiosqlite
import os

from simulation.generators.city_data import CitySimulator

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'app', 'db', 'sovereign.db')

async def seed_db():
    print(f"Seeding historical data into {DB_PATH}")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Initialize schema just in case
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL;")
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

    rng = np.random.default_rng(seed=42)
    simulator = CitySimulator(rng, ticks_per_day=86400)
    
    now_ms = int(time.time() * 1000)
    # 24 hours ago
    start_ts = now_ms - (24 * 3600 * 1000)
    
    total_ticks = 86400
    grid_id = "demo"
    
    batch_size = 10000
    rows = []
    
    # Approximation variables
    soc_pct = 50.0
    sigma = 0.5
    c_deg = 0.05
    
    print(f"Generating {total_ticks} ticks starting from {start_ts}...")
    
    async with aiosqlite.connect(DB_PATH) as db:
        for i in range(total_ticks):
            # We want to represent 1 tick = 1 second in historical data
            tick_ts = start_ts + (i * 1000)
            
            # Step the simulator to advance the noise and get base orders
            orders = simulator.step(i)
            
            # Approximate micro-price based on net grid imbalance
            # Demand = BID volume, Generation = ASK volume
            demand_vol = sum(o.volume for o in orders if o.side == 1) # Side.BID
            gen_vol = sum(o.volume for o in orders if o.side == 0) # Side.ASK
            
            # Net imbalance
            i_net = (demand_vol - gen_vol) / 1_000_000.0
            
            # Calculate a base price around 5.0 INR, shifted by imbalance
            micro_price_inr = 5.0 + (i_net * 0.1) + simulator.rng.normal(0, 0.05)
            micro_price_inr = max(1.0, min(10.0, micro_price_inr))
            micro_price_micro = int(micro_price_inr * 1_000_000)
            
            # Approximate SOC changes: SOC depletes when demand > gen (battery discharges)
            soc_pct -= (i_net * 0.001)
            # Add some mean reversion and clamp
            soc_pct += (50.0 - soc_pct) * 0.0001
            soc_pct = max(10.0, min(90.0, soc_pct))
            
            # Simulated wear cost varying slightly
            c_deg = 0.05 + abs(soc_pct - 50.0) * 0.0005
            
            rows.append((tick_ts, grid_id, micro_price_micro, soc_pct, sigma, c_deg))
            
            if len(rows) >= batch_size:
                await db.executemany(
                    "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                    rows
                )
                await db.commit()
                rows = []
                print(f"Inserted up to tick {i}...")

        if rows:
            await db.executemany(
                "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                rows
            )
            await db.commit()
            print(f"Inserted final batch up to tick {total_ticks}.")

if __name__ == "__main__":
    asyncio.run(seed_db())
