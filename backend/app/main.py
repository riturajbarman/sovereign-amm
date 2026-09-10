import asyncio
import time
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.core.config import settings
from backend.app.db.storage import storage
from backend.app.engine_facade import engine_facade
from backend.app.api.orderbook import router as orderbook_router
from backend.app.api.history import router as history_router
from backend.app.api.grid_control import router as grid_control_router

from simulation.generators.city_data import CitySimulator
import numpy as np

rng = np.random.default_rng(seed=42)
simulator = CitySimulator(rng, ticks_per_day=86400)
tick_counter = 0

async def sim_loop():
    global tick_counter
    print("Starting simulation loop at 10 Hz...")
    try:
        grid_id = "demo"
        # Ensure grid is initialized
        state, log, pf_state, params = engine_facade._get_or_create_grid(grid_id)
        
        while True:
            loop_start = time.perf_counter()
            
            # Generate new orders using load simulator
            orders = simulator.step(tick_counter)
            
            for order in orders:
                # Process order through the engine to get events
                events = state.lob.process_order(order, log.next_seq)
                for e in events:
                    await engine_facade.apply_event(grid_id, e)
            
            tick_counter += 1
            
            # Calculate sleep time to maintain exactly 10Hz (0.1s tick)
            elapsed = time.perf_counter() - loop_start
            sleep_time = max(0.0, 0.1 - elapsed)
            await asyncio.sleep(sleep_time)
            
    except asyncio.CancelledError:
        print("Simulation loop cancelled.")
    except Exception as e:
        print(f"SIMULATION LOOP CRASHED: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite / DuckDB storage
    await storage.init_db()
    
    # Start the simulation loop task
    sim_task = asyncio.create_task(sim_loop())
    yield
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)

# CORS configuration dynamically from ALLOWED_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Error Middleware
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "code": "HTTP_500_INTERNAL_SERVER_ERROR",
            "message": str(exc),
            "timestamp": int(time.time() * 1000)
        }
    )

# Routers
app.include_router(orderbook_router)
app.include_router(history_router)
app.include_router(grid_control_router)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"status": "ok", "tick": tick_counter}
