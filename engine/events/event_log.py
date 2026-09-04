from typing import List

from engine.types import Event, OrderPlaced, OrderCancelled, TradeExecuted, QuoteUpdated, SoCChanged, TradeRejected, BatteryState
from engine.core.order_book.limit_order_book import LimitOrderBook
from engine.core.degradation.rainflow_stream import RainflowStream, RainflowParams


class EngineState:
    """
    The deterministic projection of all events in the log.
    Holds the order book and battery state.
    """
    def __init__(self, trade_screener=None):
        self.lob = LimitOrderBook(trade_screener=trade_screener)
        self.battery = BatteryState(soc=50_000_000, capacity=100_000_000, timestamp=0)
        
        # Initialize rainflow cycle counter
        rf_params = RainflowParams(c_battery_capex=1_000_000.0, n0=3000.0, beta=1.5, e_nominal=100.0, eta_roundtrip=0.9)
        self.rainflow = RainflowStream(rf_params, q_max=100_000_000)
        self.rainflow.append(50_000_000) # Initial point

    def apply(self, event: Event):
        """Dispatch event to the appropriate component."""
        if isinstance(event, (OrderPlaced, OrderCancelled, TradeExecuted)):
            self.lob.apply(event)
        elif isinstance(event, SoCChanged):
            self.battery = BatteryState(soc=event.new_soc, capacity=self.battery.capacity, timestamp=0)
            self.rainflow.append(event.new_soc)
        # Handle other events later (QuoteUpdated, TradeRejected)


def replay(events: List[Event]) -> EngineState:
    """
    Rebuilds the engine state entirely from an event log.
    Proves determinism: replay(log) == live state.
    """
    state = EngineState()
    for e in events:
        state.apply(e)
    return state


class EventLog:
    """
    Append-only list of frozen Event dataclasses with monotonic sequence numbers.
    """
    def __init__(self):
        self.events: List[Event] = []
        self._seq = 0

    def next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def append(self, event: Event):
        self.events.append(event)
        
    def get_events(self) -> List[Event]:
        return self.events.copy()
