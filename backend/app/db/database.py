import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "sovereign_amm")

ASYNC_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# Fallback to SQLite async if Postgres is not reachable
FALLBACK_SQLITE_URL = "sqlite+aiosqlite:///./sovereign_production.db"
SYNC_FALLBACK_SQLITE_URL = "sqlite:///./sovereign_production.db"

Base = declarative_base()

try:
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        echo=False,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True
    )
    AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
except Exception:
    async_engine = create_async_engine(FALLBACK_SQLITE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

# Synchronous fallback engine for simple operations or sync contexts
try:
    SYNC_DATABASE_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    sync_engine = create_engine(SYNC_DATABASE_URL, pool_size=10, max_overflow=5)
    SyncSessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)
except Exception:
    sync_engine = create_engine(SYNC_FALLBACK_SQLITE_URL)
    SyncSessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)

async def init_models():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
