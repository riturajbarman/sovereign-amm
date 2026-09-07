import asyncio
import math
import time
from typing import AsyncGenerator, Dict, Any, List, Generator

from engine.events.event_log import EventLog, EngineState, SoCChanged
from engine.types import Event, Order, Side, OrderType, TradeExecuted
from engine.core.market_making.glft_pricing import quote, GLFTParams
from engine.core.power_flow.ptdf_screening import (
    GridTopology, PowerFlowState, screen_trade, create_7bus_topology
)
from backend.app.db.ticks_db import insert_tick, query_history, stream_ticks_csv

class EngineFacade:
    """
    Unified facade managing engine state, tick loops, and external streams per grid_id.
    """
    def __init__(self):
        self.grid_states: Dict[str, EngineState] = {}
        self.event_logs: Dict[str, EventLog] = {}
        self.power_flows: Dict[str, PowerFlowState] = {}
        self.glft_params: Dict[str, GLFTParams] = {}
        
    def _get_or_create_grid(self, grid_id: str) -> tuple[EngineState, EventLog, PowerFlowState, GLFTParams]:
        if grid_id not in self.grid_states:
            topology = create_7bus_topology()
            pf_state = PowerFlowState(topology)
            
            def ptdf_screener(maker_order: Order, taker_order: Order, fill_volume: int) -> bool:
                # Map trader IDs to bus indices
                trader_map = {
                    "AMM": 4, # BUS-05 Central Battery
                    "solar_farm_1": 1, # BUS-02
                    "solar_farm_2": 2, # BUS-03
                    "household_aggregator": 3, # BUS-04
                    "household_aggregator_b": 5, # BUS-06
                    "commercial_aggregator": 6, # BUS-07
                }
                seller_id = maker_order.trader_id if maker_order.side == Side.ASK else taker_order.trader_id
                buyer_id = taker_order.trader_id if maker_order.side == Side.ASK else maker_order.trader_id
                seller_bus = trader_map.get(seller_id, 0)
                buyer_bus = trader_map.get(buyer_id, 0)
                dP_kw = fill_volume / 1_000_000.0
                return screen_trade(pf_state, seller_bus, buyer_bus, dP_kw)

            state = EngineState(trade_screener=ptdf_screener)
            log = EventLog()
            params = GLFTParams(
                sigma=0.5,
                gamma=0.1,
                k=1.5,
                A=2.0,
                q_max_units=100_000_000,
                soc_floor_units=0,
                soc_ceiling_units=100_000_000,
                order_size_units=1_000_000
            )
            
            self.grid_states[grid_id] = state
            self.event_logs[grid_id] = log
            self.power_flows[grid_id] = pf_state
            self.glft_params[grid_id] = params
            
        return (
            self.grid_states[grid_id],
            self.event_logs[grid_id],
            self.power_flows[grid_id],
            self.glft_params[grid_id],
        )

    async def apply_event(self, grid_id: str, event: Event):
        state, log, pf_state, _ = self._get_or_create_grid(grid_id)
        seq_event = event
        log.append(seq_event)
        state.apply(seq_event)
        
        # Apply manual injections to power flow state
        for bus_id, mw in state.manual_injections.items():
            bus_idx = int(bus_id.replace("BUS-", "").replace("0", "")) - 1 if "BUS-" in bus_id else 0
            if 0 <= bus_idx < pf_state.topology.n_buses:
                pf_state.p_inj[bus_idx] = mw

    async def history(self, grid_id: str, window: str) -> List[Dict[str, Any]]:
        return query_history(grid_id, window)

    def ticks_csv_rows(self, grid_id: str, start: int | None = None, end: int | None = None) -> Generator[str, None, None]:
        return stream_ticks_csv(grid_id, start, end)

    async def stream_orderbook(self, grid_id: str, hz: int = 10) -> AsyncGenerator[Dict[str, Any], None]:
        tick = 0
        amm_bid_id = None
        amm_ask_id = None
        
        while True:
            t0 = time.perf_counter()
            now_ms = int(time.time() * 1000)
            state, log, pf_state, params = self._get_or_create_grid(grid_id)
            
            # 1. Micro-price reference
            mid = state.lob.micro_price()
            if math.isnan(mid) or math.isinf(mid):
                mid = 5_000_000 # 5.0 INR in micro-units
                
            # 2. Rainflow wear cost
            c_deg = state.rainflow.marginal_cost()
            
            # 3. GLFT quoting
            q_quote = quote(state.battery, mid, params, c_deg=c_deg)
            
            # 4. Cancel old & replace top of book AMM quotes
            if amm_bid_id:
                c_evt = state.lob.cancel_order(amm_bid_id, log.next_seq())
                if c_evt: log.append(c_evt)
            if amm_ask_id:
                c_evt = state.lob.cancel_order(amm_ask_id, log.next_seq())
                if c_evt: log.append(c_evt)
                
            amm_bid_id = f"AMM_BID_{tick}"
            amm_ask_id = f"AMM_ASK_{tick}"
            
            if q_quote.bid_volume > 0:
                bid_order = Order(amm_bid_id, "AMM", Side.BID, OrderType.LIMIT, q_quote.bid_price, q_quote.bid_volume, now_ms)
                for e in state.lob.process_order(bid_order, log.next_seq()): log.append(e)
                
            if q_quote.ask_volume > 0:
                ask_order = Order(amm_ask_id, "AMM", Side.ASK, OrderType.LIMIT, q_quote.ask_price, q_quote.ask_volume, now_ms)
                for e in state.lob.process_order(ask_order, log.next_seq()): log.append(e)

            # Record tick in DB
            soc_pct = (state.battery.soc / params.q_max_units) * 100.0 if params.q_max_units > 0 else 50.0
            insert_tick(grid_id, now_ms, float(mid) / 1_000_000.0, soc_pct, params.sigma, c_deg)
            
            # Compute top-12 levels & Order Book Imbalance (OBI)
            bids_raw = state.lob.get_bids_depth(depth=12)
            asks_raw = state.lob.get_asks_depth(depth=12)
            
            bids = [{"price": p, "cum_qty": q} for p, q in bids_raw]
            asks = [{"price": p, "cum_qty": q} for p, q in asks_raw]
            
            top5_bid_qty = sum(q for _, q in bids_raw[:5])
            top5_ask_qty = sum(q for _, q in asks_raw[:5])
            denom = top5_bid_qty + top5_ask_qty
            obi = (top5_bid_qty - top5_ask_qty) / denom if denom > 0 else 0.0
            
            best_bid = bids_raw[0][0] if bids_raw else mid - 10000
            best_ask = asks_raw[0][0] if asks_raw else mid + 10000
            spread = max(0, best_ask - best_bid)
            
            tape = [
                {
                    "ts": f.timestamp,
                    "side": "BUY" if f.maker_order_id.startswith("AMM_ASK") else "SELL",
                    "price": f.price,
                    "qty": f.volume,
                }
                for f in state.lob.recent_fills[-50:]
            ]
            
            snapshot = {
                "grid_id": grid_id,
                "ts": now_ms,
                "spread": int(spread),
                "micro_price": int(mid),
                "book_depth": sum(q for _, q in bids_raw) + sum(q for _, q in asks_raw),
                "obi": float(obi),
                "bids": bids,
                "asks": asks,
                "tape": tape
            }
            
            yield snapshot
            
            tick += 1
            elapsed = time.perf_counter() - t0
            sleep_time = max(0.0, (1.0 / hz) - elapsed)
            await asyncio.sleep(sleep_time)

    async def stream_grid(self, grid_id: str, hz: int = 1) -> AsyncGenerator[Dict[str, Any], None]:
        while True:
            t0 = time.perf_counter()
            now_ms = int(time.time() * 1000)
            state, log, pf_state, params = self._get_or_create_grid(grid_id)
            
            flows = pf_state.f_base
            limits = pf_state.topology.f_max
            margin = pf_state.topology.safety_margin
            
            lines = []
            for idx, (fr, to, _) in enumerate(pf_state.topology.branches):
                f_max_val = limits[idx]
                flow_pct = (abs(flows[idx]) / f_max_val) * 100.0 if f_max_val > 0 else 0.0
                lines.append({
                    "from_bus": f"BUS-0{fr + 1}",
                    "to_bus": f"BUS-0{to + 1}",
                    "flow_pct": float(flow_pct)
                })
                
            lmp = []
            for i in range(pf_state.topology.n_buses):
                bus_name = f"BUS-0{i + 1}"
                inj_mw = float(pf_state.p_inj[i])
                
                # Determine bus status based on line congestion connected to this bus
                status = "OK"
                for l_idx, (fr, to, _) in enumerate(pf_state.topology.branches):
                    if fr == i or to == i:
                        f_pct = abs(flows[l_idx]) / limits[l_idx] if limits[l_idx] > 0 else 0.0
                        if f_pct >= 1.0:
                            status = "BLOCKED"
                            break
                        elif f_pct >= margin:
                            status = "CONSTRAINED"
                            
                lmp.append({
                    "rank": i + 1,
                    "bus": bus_name,
                    "lmp": float(5.0 + (inj_mw * 0.1)),
                    "inj_mw": inj_mw,
                    "status": status
                })
                
            grid_snapshot = {
                "grid_id": grid_id,
                "ts": now_ms,
                "lines": lines,
                "lmp": lmp
            }
            
            yield grid_snapshot
            
            elapsed = time.perf_counter() - t0
            sleep_time = max(0.0, (1.0 / hz) - elapsed)
            await asyncio.sleep(sleep_time)

engine_facade = EngineFacade()
