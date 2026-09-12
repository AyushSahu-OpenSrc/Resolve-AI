"""
Database engine and session management.
"""
import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resolveai.db")

# SQLite-specific connect args for thread safety
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)


def create_db_and_tables():
    """Create all tables if they don't exist."""
    from app.models import (
        Customer, Product, Order, Inventory, Policy,
        SupportCase, Replacement, AgentExecution, AgentEvent
    )
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency for DB session."""
    with Session(engine) as session:
        yield session
