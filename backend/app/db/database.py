from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.database import Base
from sqlalchemy.sql import util as sql_util

# Maximum characters to display in SQL parameter logging before truncation
# Default is 300, increased to 10000 to show full URLs with long signatures
SQLALCHEMY_MAX_LOG_CHARS = 10000

# Monkey-patch SQLAlchemy's _repr_single_value to not truncate long parameter values
# This ensures URLs and other long values are fully logged instead of being truncated
# NOTE: This modifies SQLAlchemy internals and may need updates if SQLAlchemy changes.
# Consider using official logging configuration in future SQLAlchemy versions if available.
def _repr_single_value_no_truncate(value):
    """Custom repr that doesn't truncate parameter values"""
    rp = sql_util._repr_base()
    rp.max_chars = SQLALCHEMY_MAX_LOG_CHARS
    return rp.trunc(value)

sql_util._repr_single_value = _repr_single_value_no_truncate

# Also monkey-patch the _repr_params class to increase max_chars for all parameter logging
_original_repr_params_init = sql_util._repr_params.__init__

def _repr_params_init_no_truncate(self, params, batches, max_params=100, max_chars=SQLALCHEMY_MAX_LOG_CHARS, ismulti=None):
    """Initialize _repr_params with increased max_chars default"""
    _original_repr_params_init(self, params, batches, max_params, max_chars, ismulti)

sql_util._repr_params.__init__ = _repr_params_init_no_truncate

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True
)

# Create async session factory
async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency for getting async database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
