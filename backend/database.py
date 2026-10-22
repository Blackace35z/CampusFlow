
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

# Load environment variables from backend/.env
load_dotenv()

# Read the database URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL was not found. Check your backend/.env file."
    )

# Configure the PostgreSQL connection
engine: Engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


def test_database_connection() -> bool:
    """Check whether PostgreSQL responds to a query."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return True
