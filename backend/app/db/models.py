from sqlalchemy import Column, String, Integer, Float, BigInteger, JSON, DateTime, func, Index
from backend.app.db.database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(128), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default="market_participant")
    status = Column(String(32), default="pending")
    consumer_no = Column(String(64), nullable=True)
    connection_type = Column(String(64), nullable=True)
    sanctioned_load_kw = Column(Float, default=0.0)
    solar_kwp = Column(Float, default=0.0)
    inverter_rating_kw = Column(Float, default=0.0)
    assigned_bus_id = Column(Integer, nullable=True)
    bank_account_masked = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EventModel(Base):
    __tablename__ = "events"

    sequence_number = Column(BigInteger, primary_key=True, autoincrement=True)
    grid_id = Column(String(64), index=True, nullable=False, default="demo")
    event_type = Column(String(64), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    created_at = Column(BigInteger, nullable=False)

    __table_args__ = (
        Index("idx_events_grid_seq", "grid_id", "sequence_number"),
    )

class TickModel(Base):
    __tablename__ = "ticks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ts = Column(BigInteger, nullable=False, index=True)
    grid_id = Column(String(64), nullable=False, index=True, default="demo")
    micro_price = Column(Float, nullable=False)
    soc_pct = Column(Float, nullable=False)
    sigma = Column(Float, nullable=False)
    c_deg = Column(Float, nullable=False)

    __table_args__ = (
        Index("idx_ticks_grid_ts", "grid_id", "ts"),
    )

class Tick1mModel(Base):
    __tablename__ = "ticks_1m"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ts = Column(BigInteger, nullable=False, index=True)
    grid_id = Column(String(64), nullable=False, index=True, default="demo")
    micro_price = Column(Float, nullable=False)
    soc_pct = Column(Float, nullable=False)
    sigma = Column(Float, nullable=False)
    c_deg = Column(Float, nullable=False)

    __table_args__ = (
        Index("idx_ticks_1m_grid_ts", "grid_id", "ts"),
    )

class GridTopologyModel(Base):
    __tablename__ = "grid_topologies"

    grid_id = Column(String(64), primary_key=True)
    n_buses = Column(Integer, nullable=False)
    topology_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
