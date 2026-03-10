import re
import ssl
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# On Windows, ProactorEventLoop has SSL handshake issues with asyncpg.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

_IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")


def _build_engine_args(url: str) -> tuple[str, dict]:
    """Return (clean_url, connect_args) for the given database URL."""
    if _IS_SQLITE:
        return url, {"check_same_thread": False}

    # PostgreSQL via asyncpg — strip psycopg2-style SSL query params
    needs_ssl = "sslmode=require" in url or "neon.tech" in url
    cleaned = re.sub(r"[?&](sslmode|channel_binding|sslrootcert)=[^&]*", "", url)
    cleaned = re.sub(r"\?&", "?", cleaned).rstrip("?&")
    connect_args: dict = {}
    if needs_ssl:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx
        connect_args["timeout"] = 30
    return cleaned, connect_args


_db_url, _connect_args = _build_engine_args(settings.DATABASE_URL)

_engine_kwargs: dict = dict(
    echo=settings.ENVIRONMENT == "development",
    pool_pre_ping=True,
    connect_args=_connect_args,
)
if not _IS_SQLITE:
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10

engine = create_async_engine(_db_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables (used in development; use Alembic in production)."""
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Incremental column migrations for SQLite (idempotent — silently skip if exists)
        if _IS_SQLITE:
            for stmt in [
                "ALTER TABLE contacts ADD COLUMN social_links TEXT",
            ]:
                try:
                    await conn.execute(text(stmt))
                except Exception:
                    pass
