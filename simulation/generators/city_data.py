import numpy as np
import uuid
import time
from math import sin, pi, exp
from typing import List
from engine.types import Order, Side, OrderType

class CitySimulator:
    def __init__(self, rng: np.random.Generator, ticks_per_day: int = 86400):
        """
        ticks_per_day: 86400 means 1 tick = 1 simulated second in a 24-hour cycle.
        (At 10Hz, real-time would be 864000 ticks, but simulation can be scaled).
        """
        self.rng = rng
        self.ticks_per_day = ticks_per_day
        self.ar_alpha = 0.95
        
        # Noise terms
        self.solar_noise = 0.0
        self.wind_noise = 0.0
        self.residential_noise = 0.0
        self.commercial_noise = 0.0
        self.industrial_noise = 0.0

    def step(self, tick: int) -> List[Order]:
        # Map tick to a 24-hour cycle (0 to 24.0)
        t_hours = (tick % self.ticks_per_day) / self.ticks_per_day * 24.0
        
        # Base utility grid price
        base_price_inr = 5.0
        
        orders = []
        now_ms = int(time.time() * 1000)

        # -------------------------------------------------------------
        # BUS-01: Main Utility Grid Slack
        # Absorbs or provides large quantities at a baseline rate
        # -------------------------------------------------------------
        # Willing to buy cheap energy (Bid) and sell expensive energy (Ask)
        orders.append(Order(
            order_id=str(uuid.uuid4()), trader_id="utility_grid", side=Side.BID,
            type=OrderType.LIMIT, price=int((base_price_inr - 1.0) * 1_000_000),
            volume=int(50.0 * 1_000_000), timestamp=now_ms
        ))
        orders.append(Order(
            order_id=str(uuid.uuid4()), trader_id="utility_grid", side=Side.ASK,
            type=OrderType.LIMIT, price=int((base_price_inr + 1.0) * 1_000_000),
            volume=int(50.0 * 1_000_000), timestamp=now_ms
        ))

        # -------------------------------------------------------------
        # BUS-02: Residential Complex A
        # Morning (08:00) & Evening (19:00) load peaks via Gaussians
        # -------------------------------------------------------------
        self.residential_noise = self.ar_alpha * self.residential_noise + self.rng.normal(0, 0.1)
        peak1 = 3.0 * exp(-0.5 * ((t_hours - 8.0) / 1.5)**2)
        peak2 = 5.0 * exp(-0.5 * ((t_hours - 19.0) / 2.0)**2)
        res_demand = max(0.0, 1.0 + peak1 + peak2 + self.residential_noise)
        
        if res_demand > 0.1:
            price_bid = min(10.0, base_price_inr + 1.5 + self.rng.normal(0, 0.2))
            orders.append(Order(
                order_id=str(uuid.uuid4()), trader_id="residential_a", side=Side.BID,
                type=OrderType.LIMIT, price=int(price_bid * 1_000_000),
                volume=int(res_demand * 1_000_000), timestamp=now_ms
            ))

        # -------------------------------------------------------------
        # BUS-03: Commercial Hub
        # Daytime business hours (09:00 - 17:00)
        # -------------------------------------------------------------
        self.commercial_noise = self.ar_alpha * self.commercial_noise + self.rng.normal(0, 0.1)
        com_demand = max(0.0, 1.0 + self.commercial_noise)
        if 9.0 <= t_hours <= 17.0:
            com_demand += 4.0 # Plateau
        
        if com_demand > 0.1:
            price_bid = min(10.0, base_price_inr + 1.0 + self.rng.normal(0, 0.2))
            orders.append(Order(
                order_id=str(uuid.uuid4()), trader_id="commercial_hub", side=Side.BID,
                type=OrderType.LIMIT, price=int(price_bid * 1_000_000),
                volume=int(com_demand * 1_000_000), timestamp=now_ms
            ))

        # -------------------------------------------------------------
        # BUS-04: Solar Farm Node
        # Diurnal Solar Curve
        # -------------------------------------------------------------
        self.solar_noise = self.ar_alpha * self.solar_noise + self.rng.normal(0, 0.05)
        P_max = 12.0
        eta_clouds = 1.0 - abs(self.solar_noise) # Basic cloud effect
        
        if 6.0 <= t_hours <= 18.0:
            solar_output = P_max * max(0.0, sin(pi * (t_hours - 6) / 12)) * max(0.1, eta_clouds)
        else:
            solar_output = 0.0
            
        if solar_output > 0.1:
            # Solar wants to sell (Ask)
            price_ask = max(1.0, base_price_inr - 1.5 + self.rng.normal(0, 0.2))
            orders.append(Order(
                order_id=str(uuid.uuid4()), trader_id="solar_farm", side=Side.ASK,
                type=OrderType.LIMIT, price=int(price_ask * 1_000_000),
                volume=int(solar_output * 1_000_000), timestamp=now_ms
            ))

        # -------------------------------------------------------------
        # BUS-05: Central AMM Battery Storage
        # Handled by EngineFacade directly.
        # -------------------------------------------------------------

        # -------------------------------------------------------------
        # BUS-06: EV Charging Plaza
        # Randomized high-power pulse demand spikes
        # -------------------------------------------------------------
        # EV arrivals are poisson-like. We'll simulate chance of spike.
        ev_demand = 0.5 # Base idle load
        if self.rng.random() < 0.05: # 5% chance per tick to have a major spike
            ev_demand += self.rng.uniform(3.0, 8.0)
            
        if ev_demand > 0.5:
            price_bid = min(12.0, base_price_inr + 2.0 + self.rng.normal(0, 0.3))
            orders.append(Order(
                order_id=str(uuid.uuid4()), trader_id="ev_plaza", side=Side.BID,
                type=OrderType.LIMIT, price=int(price_bid * 1_000_000),
                volume=int(ev_demand * 1_000_000), timestamp=now_ms
            ))

        # -------------------------------------------------------------
        # BUS-07: Industrial Wind/Solar Feeder Node
        # -------------------------------------------------------------
        self.industrial_noise = self.ar_alpha * self.industrial_noise + self.rng.normal(0, 0.2)
        self.wind_noise = self.ar_alpha * self.wind_noise + self.rng.normal(0, 0.3)
        
        ind_demand = max(0.0, 3.0 + self.industrial_noise)
        wind_generation = max(0.0, 4.0 + self.wind_noise)
        
        net_industrial = ind_demand - wind_generation
        
        if net_industrial > 0:
            # Demand
            price_bid = min(10.0, base_price_inr + 0.5 + self.rng.normal(0, 0.1))
            orders.append(Order(
                order_id=str(uuid.uuid4()), trader_id="industrial_feeder", side=Side.BID,
                type=OrderType.LIMIT, price=int(price_bid * 1_000_000),
                volume=int(net_industrial * 1_000_000), timestamp=now_ms
            ))
        elif net_industrial < -0.1:
            # Generation
            price_ask = max(1.0, base_price_inr - 1.0 + self.rng.normal(0, 0.1))
            orders.append(Order(
                order_id=str(uuid.uuid4()), trader_id="industrial_feeder", side=Side.ASK,
                type=OrderType.LIMIT, price=int(abs(net_industrial) * 1_000_000),
                volume=int(abs(net_industrial) * 1_000_000), timestamp=now_ms
            ))

        # Net Grid Imbalance calculation is implied by the orderbook depth later.
        
        return orders
