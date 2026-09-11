from pydantic import BaseModel, Field
from typing import List

class BookLevel(BaseModel):
    price: int
    cum_qty: int

class TimeAndSale(BaseModel):
    ts: int
    side: str
    price: int
    qty: int

class OrderBookSnapshot(BaseModel):
    grid_id: str
    ts: int
    spread: int
    micro_price: int
    book_depth: int
    obi: float = Field(..., ge=-1.0, le=1.0)
    bids: List[BookLevel]
    asks: List[BookLevel]
    tape: List[TimeAndSale]

class InjectRequest(BaseModel):
    bus_id: str
    injection_mw: float = Field(..., ge=-5.0, le=5.0)
