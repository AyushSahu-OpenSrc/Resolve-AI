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


def _migrate_sqlite_columns():
    """Auto-migrate SQLite tables when new fields are added to existing models."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)

    needed_columns = {
        "orders": [
            ("lifecycle_state", "VARCHAR DEFAULT 'processing'"),
            ("estimated_delivery", "DATETIME"),
        ],
        "agent_events": [
            ("order_id", "VARCHAR"),
            ("customer_id", "VARCHAR"),
            ("conversation_id", "VARCHAR"),
            ("correlation_id", "VARCHAR"),
            ("actor", "VARCHAR DEFAULT 'agent'"),
            ("risk_level", "VARCHAR DEFAULT 'low'"),
            ("idempotency_key", "VARCHAR"),
        ],
    }

    with engine.begin() as conn:
        for table, cols in needed_columns.items():
            if inspector.has_table(table):
                existing = [c["name"] for c in inspector.get_columns(table)]
                for col_name, col_def in cols:
                    if col_name not in existing:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}"))


def create_db_and_tables():
    """Create all tables if they don't exist and ensure schema compatibility."""
    from app.models import (
        Customer, Product, Order, Shipment, Inventory, Policy,
        SupportCase, Replacement, AgentExecution, AgentEvent,
        CustomerConversation, ConversationMessage, CustomerPreference,
        ResolutionAction, FollowUpTask, Feedback
    )
    SQLModel.metadata.create_all(engine)
    if "sqlite" in str(engine.url):
        _migrate_sqlite_columns()


def get_session():
    """FastAPI dependency for DB session."""
    with Session(engine) as session:
        yield session
