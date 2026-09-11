import asyncio
import time
import numpy as np
import aiosqlite
import os
import math

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'app', 'db', 'sovereign.db')

class RainflowTracker:
    def __init__(self, battery_capex=15000000, n0=3000, beta=1.5, e_nom=5000, eta=0.9):
        self.battery_capex = battery_capex
        self.n0 = n0
        self.beta = beta
        self.e_nom = e_nom
        self.eta = eta
        self.stack = []
        self.last_soc = None
        self.last_dir = 0
        self.current_c_deg = 0.0

    def calculate_c_deg(self, d):
        if d < 1e-6:
            return 0.0
        n_cycles = self.n0 * (d ** -self.beta)
        c_deg = self.battery_capex / (2 * n_cycles * self.e_nom * self.eta)
        return c_deg

    def step(self, soc_kwh):
        if self.last_soc is None:
            self.last_soc = soc_kwh
            self.stack.append(soc_kwh)
            return self.current_c_deg

        delta = soc_kwh - self.last_soc
        direction = np.sign(delta)

        if direction != 0 and direction != self.last_dir:
            self.stack.append(self.last_soc)
            self.last_dir = direction
            self.process_stack()

        self.last_soc = soc_kwh
        return self.current_c_deg

    def process_stack(self):
        while len(self.stack) >= 3:
            s1 = self.stack[-3]
            s2 = self.stack[-2]
            s3 = self.stack[-1]
            X = abs(s3 - s2)
            Y = abs(s2 - s1)
            
            if X >= Y:
                # Cycle identified
                depth = Y / self.e_nom
                self.current_c_deg = self.calculate_c_deg(depth)
                self.stack.pop(-2)
            else:
                break

async def seed_db():
    print(f"Seeding historical data into {DB_PATH}")
    
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
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
        # Clear existing data for demo
        await db.execute("DELETE FROM ticks WHERE grid_id = 'demo';")
        await db.commit()

    rng = np.random.default_rng(seed=42)
    
    now_ms = int(time.time() * 1000)
    # Generate data such that the last tick is "now"
    total_ticks = 8640
    start_ts = now_ms - (total_ticks * 10 * 1000)
    
    grid_id = "demo"
    batch_size = 1000
    rows = []
    
    # Grid Parameters
    Q_max = 5000.0  # 5 MWh
    soc_kwh = 2500.0  # Start at 50%
    mid_price = 5.0
    
    # GLFT Parameters
    k = 1.0
    gamma = 0.1
    A = 1.0
    
    rainflow = RainflowTracker()
    
    print(f"Generating {total_ticks} ticks (24 hours at 10s intervals)...")
    
    async with aiosqlite.connect(DB_PATH) as db:
        for i in range(total_ticks):
            tick_ts = start_ts + (i * 10 * 1000)
            
            # Time of day in hours (0 to 24)
            t_seconds = (i * 10)
            hour = (t_seconds / 3600.0) % 24.0
            
            # 1. Load Profile (100 houses)
            # Morning peak: ~08:30
            # Evening peak: ~19:30
            # Base load per house ~ 0.5 kW, peak ~ 3 kW
            demand_kw = 100 * (
                0.5 + 
                2.5 * math.exp(-((hour - 8.5) ** 2) / (2 * 1.5 ** 2)) + 
                3.0 * math.exp(-((hour - 19.5) ** 2) / (2 * 2.0 ** 2))
            )
            
            # 2. Solar Profile (subset of houses, e.g. 50 houses * 3 kW peak)
            solar_kw = 150.0 * max(0.0, math.exp(-((hour - 13.0) ** 2) / (2 * 2.0 ** 2)) - 0.1) * (1 / 0.9)
            if solar_kw < 0: solar_kw = 0.0
            
            # Add stochastic noise (±3% jitter)
            demand_kw += rng.normal(0, 0.03 * demand_kw)
            solar_kw += rng.normal(0, 0.03 * solar_kw) if solar_kw > 0 else 0
            demand_kw = max(0, demand_kw)
            solar_kw = max(0, solar_kw)
            
            net_load_kw = demand_kw - solar_kw
            
            # 3. Battery Update
            energy_delta_kwh = net_load_kw * (10.0 / 3600.0)
            soc_kwh -= energy_delta_kwh
            
            # Clamp SoC
            soc_min, soc_max = 0.1 * Q_max, Q_max
            soc_kwh = max(soc_min, min(soc_max, soc_kwh))
            soc_pct = (soc_kwh / Q_max) * 100.0
            
            # Rainflow tracking
            c_deg = rainflow.step(soc_kwh)
            if c_deg == 0.0:
                c_deg = 0.01 # Base minimum wear cost for any flow
                
            # 4. Math Models
            q = 2 * (soc_kwh - Q_max / 2) / Q_max
            sigma = 0.5 + 0.1 * abs(net_load_kw) / 100.0
            
            base = (1/k) * math.log(1 + k/gamma)
            spread = math.sqrt((sigma**2 * gamma) / (2*k*A) * ((1 + gamma/k)**(1 + k/gamma)))
            
            delta_bid = base + ((2*q + 1) / 2) * spread
            delta_ask = base - ((2*q - 1) / 2) * spread
            
            bid = mid_price - delta_bid
            ask = mid_price + delta_ask + c_deg
            
            # Micro-price calculation based on V_bid (demand) and V_ask (solar generation)
            v_bid = demand_kw
            v_ask = solar_kw
            if v_bid + v_ask > 0:
                micro_inr = (bid * v_ask + ask * v_bid) / (v_bid + v_ask)
            else:
                micro_inr = mid_price
            
            # Clamping pricing to valid ranges
            micro_inr = max(1.0, min(10.0, micro_inr))
            micro_price_micro = int(micro_inr * 1_000_000)
            
            rows.append((tick_ts, grid_id, micro_price_micro, soc_pct, sigma, c_deg))
            
            if len(rows) >= batch_size:
                await db.executemany(
                    "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                    rows
                )
                await db.commit()
                rows = []

        if rows:
            await db.executemany(
                "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                rows
            )
            await db.commit()

    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed_db())
